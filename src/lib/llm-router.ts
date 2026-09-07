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
// (full fallback-chain outage), 2026-09-07 (model-ID incident, see below), and
// re-pointed to a Gemini-primary chain the same day per PRD v3.1:
//   PRIMARY tier (the live interviewer turn the candidate is waiting on):
//   0. local — DEV ONLY. Present only when LLM_BASE_URL is set (never on
//      Vercel), points at an OpenAI-compatible server on-box (Ollama, e.g.
//      qwen2.5:14b). First in line so `npm run dev` spends zero hosted quota;
//      falls through to the cloud chain if the local server is down.
//   1. Gemini 2.5 Flash-Lite — Google's free tier, its OWN quota (independent
//      of Groq/Cerebras), ~1K requests/DAY. PRD v3.1's designated primary:
//      cheapest capable model, thinking OFF by default so no hidden-reasoning
//      handling needed. Only in the chain when GEMINI_API_KEY (or
//      GOOGLE_API_KEY) is set; absent it, the chain is exactly the pre-Gemini
//      one below with zero change.
//   2. Groq — openai/gpt-oss-120b. Free tier has a ~1K req/DAY + token/day cap
//      that exhausts under heavy use, so the layers below are not theoretical.
//      gpt-oss-120b emits hidden reasoning tokens -> reasoning_effort:'low' +
//      a max_tokens floor (same as Cerebras).
//   3. Cerebras — gpt-oss-120b, a SEPARATE free-tier quota again.
//   4. Groq (2nd model) — qwen/qwen3.8-27b. Plain instruct model on the SAME
//      key/quota as layer 2; MODEL-diversity insurance so one model
//      deprecation (exactly 2026-09-07) can't blank a layer. NOT
//      provider-diversity.
//   5. OpenRouter — emergency fallback, only if OPENROUTER_API_KEY is set.
//      Pointed at qwen/qwen-2.5-72b-instruct: a genuinely independent account
//      AND a different model family from the gpt-oss/Gemini above it.
//   AUX tier (issue-tree / cheatsheet / critic / opener / walkthrough /
//   evaluate-session): leads with Cerebras and keeps Gemini LAST — those
//   calls are ~3x primary volume, and burning Gemini's ~1K/day cap on them
//   would starve the live turn it's meant to serve.
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
// Configure via env: GEMINI_API_KEY (or GOOGLE_API_KEY), GROQ_API_KEY,
// CEREBRAS_API_KEY, OPENROUTER_API_KEY. Any subset works; route picks whatever
// is present. Each provider speaks OpenAI-compatible /v1/chat/completions
// (Gemini via its generativelanguage.googleapis.com/v1beta/openai/ shim).
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
  // Per-provider timeout overrides. Only set for the local dev provider,
  // where a cold Ollama model load + CPU/consumer-GPU inference legitimately
  // takes far longer than the hosted-provider budgets below. Everything else
  // uses the module defaults.
  connectTimeoutMs?: number;
  chunkTimeoutMs?: number;
  completeTimeoutMs?: number;
}

// Time-boxes. CONNECT covers request → response headers (where NVIDIA's
// observed hang lives); CHUNK covers each read of an already-open stream so
// a mid-stream stall also fails over instead of eating the route budget.
const CONNECT_TIMEOUT_MS = 12_000;
const CHUNK_TIMEOUT_MS = 15_000;
const COMPLETE_TIMEOUT_MS = 30_000;

function providers(tier: 'primary' | 'aux' = 'primary'): Provider[] {
  // LOCAL dev provider — only present when LLM_BASE_URL is set, which it never
  // is on Vercel (verified: not in prod env), so this is null in production and
  // the chain is unchanged there. Locally, pointing LLM_BASE_URL at an
  // OpenAI-compatible server (Ollama: http://localhost:11434/v1) runs every
  // interviewer turn on-box for zero hosted-API quota during `npm run dev`.
  // Put FIRST in both chains; if the local server is down the request just
  // falls through to Gemini/Groq like any other provider failure. Timeouts are
  // widened generously — a cold `qwen2.5:14b` load can take 30s+ before first
  // token on consumer hardware. Same env var + model knob the ingest scripts
  // and src/lib/groq/client.ts already use.
  const localBase = process.env.LLM_BASE_URL;
  const local: Provider | null = localBase
    ? {
        name: 'local',
        url: `${localBase.replace(/\/+$/, '')}/chat/completions`,
        key:
          localBase.includes('localhost') || localBase.includes('127.0.0.1')
            ? 'ollama' // Ollama ignores the bearer; just needs a non-empty string
            : process.env.LLM_API_KEY || process.env.NVIDIA_API_KEY || 'local',
        model: process.env.LLM_LOCAL_MODEL || 'qwen2.5:14b',
        supports_json_streaming: true,
        connectTimeoutMs: 120_000,
        chunkTimeoutMs: 120_000,
        completeTimeoutMs: 180_000,
      }
    : null;

  // Gemini 2.5 Flash-Lite via Google's OpenAI-compatible shim. PRD v3.1's
  // designated PRIMARY: its own free-tier quota (independent of Groq/Cerebras),
  // and 2.5 Flash-Lite runs with thinking OFF by default, so — unlike the
  // gpt-oss entries — it needs no reasoning_effort / max_tokens-floor handling
  // and streams plain content. GOOGLE_API_KEY accepted as an alias since that
  // is the name the google-genai SDKs default to.
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const gemini: Provider | null = geminiKey
    ? {
        name: 'gemini',
        url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        key: geminiKey,
        // gemini-2.5-flash-lite is retired ("no longer available to new
        // users"); gemini-3.5-flash-lite is the current lite tier — verified
        // live 2026-09-07: clean content, thinking minimal (the non-lite
        // gemini-3.5-flash burned a 30-tok budget on hidden reasoning and
        // returned empty, so the lite model specifically is the safe pick
        // here — no reasoning_effort/max_tokens-floor handling needed).
        // Override with GEMINI_MODEL if Google moves the tier again.
        model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
        supports_json_streaming: true,
      }
    : null;
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
        // The genuinely-independent 3rd quota (own account, own billing).
        // 2026-09-07: pointed at `qwen/qwen-2.5-72b-instruct` on purpose —
        // it's a plain instruct model (verified live: clean "OK", no hidden
        // reasoning, so no extraBody/minMaxTokens needed) AND it's a
        // different model family from the gpt-oss everywhere else / Gemini,
        // so a bad gpt-oss weekend can't take out this layer too. Free-tier
        // key: works, but daily-rate-limited — correct for a 4th-in-line
        // emergency fallback. (`openai/gpt-oss-120b` also works here but
        // returns empty on small budgets without the reasoning handling.)
        model: process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-72b-instruct',
        supports_json_streaming: true,
      }
    : null;

  // 'aux' leads with Cerebras — a separate free-tier quota from Groq's
  // shared 100K/day budget, and fast enough (~700ms) that aux callers lose
  // nothing by not touching Groq at all in the common case. Groq still sits
  // right behind it as a real fallback, not removed — just no longer first
  // in line for calls that don't need to be.
  // PRD v3.1: Gemini leads the PRIMARY chain (its own quota, cheapest capable
  // model). On AUX it sits LAST — aux calls are ~3x primary volume and must not
  // eat Gemini's ~1K/day cap. When GEMINI_API_KEY is unset, `gemini` is null
  // and both chains are exactly the pre-Gemini order.
  // `local` first when present (dev only — null in prod). Then per PRD v3.1:
  // Gemini leads PRIMARY; on AUX Gemini sits LAST (aux is ~3x primary volume,
  // must not eat Gemini's ~1K/day cap).
  const ordered =
    tier === 'aux'
      ? [local, cerebras, groq, groqAlt, openrouter, gemini]
      : [local, gemini, groq, cerebras, groqAlt, openrouter];
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

// Structured one-liner so "which provider actually served this turn" is
// visible in Vercel runtime logs without a tracing backend. `grep '[llm-router]'`
// gives per-turn provider attribution + fallback depth (idx>0 = a fallthrough
// happened). Kept to info level and one line — not a hot-path cost.
function logServed(fn: 'stream' | 'complete', tier: string, name: string, idx: number, attempts: number) {
  console.info(`[llm-router] ${fn} tier=${tier} served_by=${name} idx=${idx} attempts=${attempts}`);
}

interface ChatOpts {
  messages: Msg[];
  max_tokens?: number;
  temperature?: number;
  json?: boolean;
  /**
   * 'primary' (default) = Gemini 2.5 Flash-Lite first (Groq, then Cerebras
   * behind it) — the live interviewer turn the candidate is waiting on.
   * 'aux' = Cerebras first, Gemini last — issue-tree, cheatsheet, critic,
   * opener, walkthrough, evaluate-session: real work, ~3x the primary call
   * volume, so kept off Gemini's ~1K/day cap and Groq's shared daily quota
   * when a separately-quota'd, comparably-fast provider is sitting right there.
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
  let idx = -1;
  let attempts = 0;
  for (const p of list) {
    idx++;
    if (!bypassCircuits && circuitIsOpen(circuitFor(p.name), Date.now())) {
      lastErr = new Error(`${p.name}: circuit open (recent repeated failures)`);
      continue; // skip outright — no point paying this provider's timeout again
    }
    attempts++;
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
      const connectTimer = setTimeout(() => connectCtrl.abort(), p.connectTimeoutMs ?? CONNECT_TIMEOUT_MS);
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
        const { value, done } = await readWithTimeout(reader.read(), p.chunkTimeoutMs ?? CHUNK_TIMEOUT_MS, p.name);
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
            logServed('stream', opts.tier ?? 'primary', p.name, idx, attempts);
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
      logServed('stream', opts.tier ?? 'primary', p.name, idx, attempts);
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
  let idx = -1;
  let attempts = 0;
  for (const p of list) {
    idx++;
    if (!bypassCircuits && circuitIsOpen(circuitFor(p.name), Date.now())) {
      lastErr = new Error(`${p.name}: circuit open (recent repeated failures)`);
      continue;
    }
    attempts++;
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
      const timer = setTimeout(() => ctrl.abort(), p.completeTimeoutMs ?? COMPLETE_TIMEOUT_MS);
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
        logServed('complete', opts.tier ?? 'primary', p.name, idx, attempts);
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
