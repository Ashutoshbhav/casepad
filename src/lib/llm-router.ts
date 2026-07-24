// Multi-provider LLM router with rotation on 429.
// Tries providers in order; on 429 / 5xx / timeout falls through. For chat
// streaming, returns SSE-compatible parsed deltas.
//
// Order tuned for chat (latency + token-budget), re-verified live 2026-07-24
// during a full production outage of the fallback chain:
//   1. Groq (fast; free tier has a 100K tokens/DAY cap — exhausts by evening
//      under heavy use, so the layers below are not theoretical)
//   2. Cerebras (free tier, extremely fast; gpt-oss-120b — they dropped all
//      Llama models, the old llama3.1-70b id 404s now)
//   3. NVIDIA NIM (observed HANGING >30s on requests — kept as a late layer,
//      survivable only because every attempt is now time-boxed)
//   4. OpenRouter (proxies to many models) — emergency fallback
//
// Every attempt is TIME-BOXED (connection + inter-chunk): a provider that
// hangs must cost seconds, not the route's whole 60s budget. This was the
// actual failure mode on 2026-07-24 — Groq's daily quota ran out, NVIDIA
// hung on every request, and /api/chat 504'd instead of falling through.
//
// Configure via env: GROQ_API_KEY, CEREBRAS_API_KEY, NVIDIA_API_KEY,
// OPENROUTER_API_KEY. Any subset works; route picks whatever's present.
// Each provider speaks OpenAI-compatible /v1/chat/completions.

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

function providers(): Provider[] {
  const list: Provider[] = [];
  if (process.env.GROQ_API_KEY) {
    list.push({
      name: 'groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key: process.env.GROQ_API_KEY,
      model: 'llama-3.3-70b-versatile',
      supports_json_streaming: true,
    });
  }
  if (process.env.CEREBRAS_API_KEY) {
    list.push({
      name: 'cerebras',
      url: 'https://api.cerebras.ai/v1/chat/completions',
      key: process.env.CEREBRAS_API_KEY,
      // 2026-07-24: Cerebras removed every Llama model (llama3.1-70b now
      // 404s — verified against their /v1/models). gpt-oss-120b is their
      // strongest live model; reasoning_effort low + a max_tokens floor
      // keep it behaving like a plain chat model (verified: clean content,
      // ~700ms). Promoted ABOVE nvidia, which was observed hanging.
      model: 'gpt-oss-120b',
      supports_json_streaming: true,
      extraBody: { reasoning_effort: 'low' },
      minMaxTokens: 300,
    });
  }
  if (process.env.NVIDIA_API_KEY) {
    list.push({
      name: 'nvidia',
      url: 'https://integrate.api.nvidia.com/v1/chat/completions',
      key: process.env.NVIDIA_API_KEY,
      model: 'meta/llama-3.3-70b-instruct',
      supports_json_streaming: true,
    });
  }
  if (process.env.OPENROUTER_API_KEY) {
    list.push({
      name: 'openrouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      key: process.env.OPENROUTER_API_KEY,
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      supports_json_streaming: true,
    });
  }
  return list;
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
}

// Streaming chat — returns an async iterator of content deltas.
// Tries providers in order; on 429/5xx falls through.
export async function* streamChat(opts: ChatOpts): AsyncGenerator<string, void, void> {
  const list = providers();
  if (list.length === 0) throw new Error('no LLM providers configured');

  let lastErr: any = null;
  let yieldedThisAttempt = false;
  for (const p of list) {
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
          if (payload === '[DONE]') return;
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
      return; // successful stream end
    } catch (e) {
      // Once content has been yielded to the caller, failing over would
      // append a SECOND provider's full reply after the first's partial one
      // — a corrupted turn. Surface the failure instead; the route's own
      // retry/fallback machinery owns partial-turn recovery.
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
  const list = providers();
  let lastErr: any = null;
  for (const p of list) {
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
        continue;
      }
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`${p.name} ${r.status}: ${txt.slice(0, 200)}`);
      }
      const data = await r.json() as any;
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim()) return content;
      // Empty content is a FAILURE, not a success — reasoning models can
      // burn the whole budget on hidden reasoning and return nothing;
      // silently returning '' used to propagate a blank turn downstream.
      lastErr = new Error(`${p.name}: empty completion content`);
      continue;
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr ?? new Error('all providers failed');
}
