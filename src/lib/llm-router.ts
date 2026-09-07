import {
  initialCircuitState,
  isOpen as circuitIsOpen,
  onSuccess as circuitOnSuccess,
  onFailure as circuitOnFailure,
  type CircuitState,
} from './provider-circuit-breaker';

// Multi-provider LLM router with rotation on 429.
// Tries providers in order; on 429 / 5xx / timeout falls through. For chat
// streaming, returns SSE-compatible parsed deltas.
//
// Order tuned for chat (latency + token-budget). Re-verified live 2026-07-24
// (full fallback-chain outage) and again 2026-09-07 (see the model-ID note
// below):
//   1. Groq  — openai/gpt-oss-120b. Free tier has a 100K tokens/DAY cap that
//      exhausts by evening under heavy use, so the layers below are not
//      theoretical. gpt-oss-120b emits hidden reasoning tokens, so it needs
//      reasoning_effort:'low' + a max_tokens floor (same as Cerebras below).
//   2. Cerebras — gpt-oss-120b, a SEPARATE free-tier quota from Groq's.
//   3. Groq (2nd model) — qwen/qwen3.8-27b. A plain instruct model on the same
//      key/quota as layer 1; here as MODEL-diversity insurance so a single
//      model deprecation (exactly what happened on 2026-09-07) can't blank a
//      layer again. NOT provider-diversity — see the gap note below.
//   4. OpenRouter — emergency fallback, only if OPENROUTER_API_KEY is set.
//
// 2026-09-07 INCIDENT — DEAD MODEL IDs: Groq deprecated its whole Llama line
// (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) and NVIDIA NIM started
// returning HTTP 410 Gone for every model tried on this key. That left the
// "4-layer fortress" running on Cerebras alone (layer 1 + layer 2 IDs both
// dead, layer 4 unconfigured) — the same silent-degradation shape as the
// blank-secrets month. Fix: Groq -> gpt-oss-120b (verified live), NVIDIA slot
// replaced with a 2nd Groq model (qwen/qwen3.8-27b, verified live) since no
// live NVIDIA model could be found for this key. All IDs here are verified
// against each provider's live /v1/models + a real 1-line completion on
// 2026-09-07. GAP: real provider-diversity is now only Groq + Cerebras — add
// an OPENROUTER_API_KEY (or another independent provider) to restore a 3rd
// independent quota. Offline scripts (scripts/ingest/extract*.ts,
// scripts/qa/*, scripts/pm-gate.mjs) still reference the dead Groq IDs and
// need the same swap.
//
// Every attempt is TIME-BOXED (connection + inter-chunk): a provider that
// hangs must cost seconds, not the route's whole 60s budget. This was the
// actual failure mode on 2026-07-24 — Groq's daily quota ran out, NVIDIA
// hung on every request, and /api/chat 504'd instead of falling through.
//
// TIER (added same incident): a single candidate turn in a case session
// fans out to 3-4 LLM calls total — the primary interviewer reply PLUS
// issue-tree extraction, cheatsheet update, and (every other turn) the
// self-critique judge, each hitting this SAME router. Left unmarked, all
// of them competed for Groq's one shared 100K/day budget, so the aux calls
// were silently eating the primary chat's headroom. `tier: 'aux'` (default
// 'primary') puts Cerebras FIRST instead of Groq for exactly the calls
// that don't need Groq's edge in quality/latency — issue-tree, cheatsheet,
// critic, opener, walkthrough, evaluate-session — leaving Groq's budget to
// last longer for the live turn the candidate is actually waiting on.
//
// Configure via env: GROQ_API_KEY, CEREBRAS_API_KEY, NVIDIA_API_KEY,
// OPENROUTER_API_KEY. Any subset works; route picks whatever's present.
// Each provider speaks OpenAI-compatible /v1/chat/completions.
//
// CIRCUIT BREAKER (added 2026-09-05, see provider-circuit-breaker.ts): the
// fallback above already survives a single bad request, but on its own it
// re-attempts every provider from scratch on every new request — during a
// real outage (Groq's daily quota exhausted, NVIDIA hanging on every call,
// both from the 2026-07-24 incident referenced above) that means paying a
// dead provider's full timeout on every single request for as long as the
// outage lasts. `providerCircuits` remembers recent failures per provider
// name and skips a provider outright once it's tripped, so an ongoing
// outage costs one short burst of failures, not one per request. Lives in
// process memory — see that file's header for what that does and doesn't
// guarantee on a serverless deployment.
const providerCircuits = new Map<string, CircuitState>();

function circuitFor(name: string): CircuitState {
  return providerCircuits.get(name) ?? initialCircuitState;
}

// Fail-open safety valve: if every configured provider's circuit happens to be
// open at once (e.g. a shared blip trips all of them together), the breaker
// must never be the thing that makes a request give up with zero attempt —
// that would make this change actively worse than not having it, on exactly
// the kind of full-outage case the router's fallback exists to survive. In
// that case, ignore circuit state entirely for this call and try every
// provider fresh, same as if the breaker didn't exist.
function allCircuitsOpen(list: Provider[], nowMs: number): boolean {
  return list.length > 0 && list.every((p) => circuitIsOpen(circuitFor(p.name), nowMs));
}

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

interface Provider {
  name: string;
  url: string;
  key: string | undefined;
  model: string;
  // Some providers don't fully support streaming JSON-mode; flag here.
  supports_json_streaming?: boolean;
  // Provider-specific request-body additions (e.g. Cerebras gpt-oss-120b
  // needs reasoning_effort pinned low or it burns the budget thinking).
  extraBody?: Record<string, unknown>;
  // Floor on max_tokens for this provider — reasoning models emit hidden
  // reasoning tokens BEFORE content, so a small caller budget can produce
  // an empty reply. The floor guarantees content survives.
  minMaxTokens?: number;
}

// Time-boxes. CONNECT covers request → response headers (where NVIDIA's
// observed hang lives); CHUNK covers each read of an already-open stream so
// a mid-stream stall also fails over instead of eating the route budget.
const CONNECT_TIMEOUT_MS = 12_000;
const CHUNK_TIMEOUT_MS = 15_000;
const COMPLETE_TIMEOUT_MS = 30_000;

function providers(tier: 'primary' | 'aux' = 'primary'): Provider[] {
  const groq: Provider | null = process.env.GROQ_API_KEY
    ? {
        name: 'groq',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        key: process.env.GROQ_API_KEY,
        // 2026-09-07: Groq deprecated its entire Llama line
        // (`llama-3.3-70b-versatile` now model_not_found). gpt-oss-120b is the
        // strongest model it hosts now; like the Cerebras entry it emits
        // hidden reasoning tokens, so reasoning_effort:'low' + a max_tokens
        // floor keep it behaving like a plain chat model (verified 2026-09-07:
        // clean content, no <think> leak).
        model: 'openai/gpt-oss-120b',
        supports_json_streaming: true,
        extraBody: { reasoning_effort: 'low' },
        minMaxTokens: 300,
      }
    : null;
  const cerebras: Provider | null = process.env.CEREBRAS_API_KEY
    ? {
        name: 'cerebras',
        url: 'https://api.cerebras.ai/v1/chat/completions',
        key: process.env.CEREBRAS_API_KEY,
        // 2026-07-24: Cerebras removed every Llama model (llama3.1-70b now
        // 404s — verified against their /v1/models). gpt-oss-120b is their
        // strongest live model; reasoning_effort low + a max_tokens floor
        // keep it behaving like a plain chat model (verified: clean content,
        // ~700ms). Still live as of 2026-09-07.
        model: 'gpt-oss-120b',
        supports_json_streaming: true,
        extraBody: { reasoning_effort: 'low' },
        minMaxTokens: 300,
      }
    : null;
  // 2026-09-07: NVIDIA NIM returns HTTP 410 Gone for every model tried on this
  // key (meta/llama-3.3-70b-instruct, meta/llama-3.1-70b-instruct,
  // nvidia/llama-3.1-nemotron-70b-instruct, openai/gpt-oss-120b, …) — the
  // integrate.api access looks fully deprecated for this account, not just one
  // model. No live NVIDIA model could be found, so this slot now holds a 2nd
  // Groq model (qwen/qwen3.8-27b, a plain instruct model — verified live) as
  // model-deprecation insurance. It shares Groq's key/quota, so it is NOT a
  // substitute for a 3rd independent provider (add OPENROUTER_API_KEY to
  // restore that). Re-check NVIDIA later: if it comes back, point `url` at
  // integrate.api and set a verified model here.
  const groqAlt: Provider | null = process.env.GROQ_API_KEY
    ? {
        name: 'groq-qwen',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        key: process.env.GROQ_API_KEY,
        model: 'qwen/qwen3.8-27b',
        supports_json_streaming: true,
      }
    : null;
  const openrouter: Provider | null = process.env.OPENROUTER_API_KEY
    ? {
        name: 'openrouter',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        key: process.env.OPENROUTER_API_KEY,
        // Unconfigured (no OPENROUTER_API_KEY). Kept ready as the only path to
        // a 3rd independent quota. gpt-oss-120b is broadly available on
        // OpenRouter; verify the exact slug when a key is added.
        model: 'openai/gpt-oss-120b',
        supports_json_streaming: true,
      }
    : null;

  // 'aux' leads with Cerebras — a separate free-tier quota from Groq's
  // shared 100K/day budget, and fast enough (~700ms) that aux callers lose
  // nothing by not touching Groq at all in the common case. Groq still sits
  // right behind it as a real fallback, not removed — just no longer first
  // in line for calls that don't need to be.
  const ordered =
    tier === 'aux' ? [cerebras, groq, groqAlt, openrouter] : [groq, cerebras, groqAlt, openrouter];
  return ordered.filter((p): p is Provider => p !== null);
}

// reader.read() with a deadline — a stream that opens and then stalls is as
// dead as one that never connects, and must fail over just as fast.
async function readWithTimeout<T>(
  read: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: stream stalled >${ms}ms`)), ms);
  });
  try {
    return await Promise.race([read, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

interface ChatOpts {
  messages: Msg[];
  max_tokens?: number;
  temperature?: number;
  json?: boolean;
  /**
   * 'primary' (default) = Groq first — the live interviewer turn the
   * candidate is waiting on. 'aux' = Cerebras first — issue-tree,
   * cheatsheet, critic, opener, walkthrough, evaluate-session: real work,
   * but not worth spending shared Groq daily-quota headroom on when a
   * separately-quota'd, comparably-fast provider is sitting right there.
   */
  tier?: 'primary' | 'aux';
}

// Streaming chat — returns an async iterator of content deltas.
// Tries providers in order; on 429/5xx falls through.
export async function* streamChat(opts: ChatOpts): AsyncGenerator<string, void, void> {
  const list = providers(opts.tier);
  if (list.length === 0) throw new Error('no LLM providers configured');

  let lastErr: any = null;
  let yieldedThisAttempt = false;
  const bypassCircuits = allCircuitsOpen(list, Date.now());
  for (const p of list) {
    if (!bypassCircuits && circuitIsOpen(circuitFor(p.name), Date.now())) {
      lastErr = new Error(`${p.name}: circuit open (recent repeated failures)`);
      continue; // skip outright — no point paying this provider's timeout again
    }
    try {
      const baseMax = opts.max_tokens ?? 300;
      const body: any = {
        model: p.model,
        messages: opts.messages,
        stream: true,
        max_tokens: p.minMaxTokens ? Math.max(baseMax, p.minMaxTokens) : baseMax,
        temperature: opts.temperature ?? 0.4,
        ...(p.extraBody ?? {}),
      };
      if (opts.json) body.response_format = { type: 'json_object' };

      // Connection time-box — covers the request → headers window, which is
      // exactly where NVIDIA was observed hanging for 30s+.
      const connectCtrl = new AbortController();
      const connectTimer = setTimeout(() => connectCtrl.abort(), CONNECT_TIMEOUT_MS);
      let r: Response;
      try {
        r = await fetch(p.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'Authorization': `Bearer ${p.key}`,
          },
          body: JSON.stringify(body),
          signal: connectCtrl.signal,
        });
      } finally {
        clearTimeout(connectTimer);
      }

      if (r.status === 429 || (r.status >= 500 && r.status < 600)) {
        lastErr = new Error(`${p.name} ${r.status}`);
        providerCircuits.set(p.name, circuitOnFailure(circuitFor(p.name), Date.now()));
        continue; // try next provider
      }
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`${p.name} ${r.status}: ${txt.slice(0, 200)}`);
      }
      if (!r.body) throw new Error(`${p.name}: empty body`);

      // Parse SSE: lines like "data: {...}\n\n"; end on "data: [DONE]"
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      yieldedThisAttempt = false;
      while (true) {
        const { value, done } = await readWithTimeout(reader.read(), CHUNK_TIMEOUT_MS, p.name);
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const ln of lines) {
          const line = ln.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') {
            providerCircuits.set(p.name, circuitOnSuccess());
            return;
          }
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content;
            if (delta) {
              yieldedThisAttempt = true;
              yield delta as string;
            }
          } catch {
            // ignore malformed line
          }
        }
      }
      providerCircuits.set(p.name, circuitOnSuccess());
      return; // successful stream end
    } catch (e) {
      // Once content has been yielded to the caller, failing over would
      // append a SECOND provider's full reply after the first's partial one
      // — a corrupted turn. Surface the failure instead; the route's own
      // retry/fallback machinery owns partial-turn recovery.
      providerCircuits.set(p.name, circuitOnFailure(circuitFor(p.name), Date.now()));
      if (yieldedThisAttempt) throw e;
      lastErr = e;
      continue;
    }
  }
  throw lastErr ?? new Error('all providers failed');
}

// Non-streaming completion — same provider rotation logic, whole-call
// time-boxed per provider.
export async function completeChat(opts: ChatOpts): Promise<string> {
  const list = providers(opts.tier);
  let lastErr: any = null;
  const bypassCircuits = allCircuitsOpen(list, Date.now());
  for (const p of list) {
    if (!bypassCircuits && circuitIsOpen(circuitFor(p.name), Date.now())) {
      lastErr = new Error(`${p.name}: circuit open (recent repeated failures)`);
      continue;
    }
    try {
      const baseMax = opts.max_tokens ?? 800;
      const body: any = {
        model: p.model,
        messages: opts.messages,
        stream: false,
        max_tokens: p.minMaxTokens ? Math.max(baseMax, p.minMaxTokens) : baseMax,
        temperature: opts.temperature ?? 0.2,
        ...(p.extraBody ?? {}),
      };
      if (opts.json) body.response_format = { type: 'json_object' };

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), COMPLETE_TIMEOUT_MS);
      let r: Response;
      try {
        r = await fetch(p.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${p.key}`,
          },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (r.status === 429 || (r.status >= 500 && r.status < 600)) {
        lastErr = new Error(`${p.name} ${r.status}`);
        providerCircuits.set(p.name, circuitOnFailure(circuitFor(p.name), Date.now()));
        continue;
      }
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`${p.name} ${r.status}: ${txt.slice(0, 200)}`);
      }
      const data = await r.json() as any;
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim()) {
        providerCircuits.set(p.name, circuitOnSuccess());
        return content;
      }
      // Empty content is a FAILURE, not a success — reasoning models can
      // burn the whole budget on hidden reasoning and return nothing;
      // silently returning '' used to propagate a blank turn downstream.
      lastErr = new Error(`${p.name}: empty completion content`);
      providerCircuits.set(p.name, circuitOnFailure(circuitFor(p.name), Date.now()));
      continue;
    } catch (e) {
      providerCircuits.set(p.name, circuitOnFailure(circuitFor(p.name), Date.now()));
      lastErr = e;
      continue;
    }
  }
  throw lastErr ?? new Error('all providers failed');
}
