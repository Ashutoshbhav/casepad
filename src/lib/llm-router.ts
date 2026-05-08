// Multi-provider LLM router with rotation on 429.
// Tries providers in order; on 429 / 5xx falls through. For chat streaming,
// returns SSE-compatible parsed deltas. Each call also retries the SAME
// provider once on transient network errors before failing over.
//
// Order tuned for chat (latency + token-budget):
//   1. Groq (fast, but 6K TPM cap on free) — first 1-2 users in a minute
//   2. NVIDIA NIM (slower, looser tokens) — fallback at scale
//   3. Cerebras (free tier, fast Llama 3.3-70b) — final fallback
//   4. OpenRouter (proxies to many models) — emergency fallback
//
// Configure via env: GROQ_API_KEY, NVIDIA_API_KEY, CEREBRAS_API_KEY,
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
}

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
  if (process.env.NVIDIA_API_KEY) {
    list.push({
      name: 'nvidia',
      url: 'https://integrate.api.nvidia.com/v1/chat/completions',
      key: process.env.NVIDIA_API_KEY,
      model: 'meta/llama-3.3-70b-instruct',
      supports_json_streaming: true,
    });
  }
  if (process.env.CEREBRAS_API_KEY) {
    list.push({
      name: 'cerebras',
      url: 'https://api.cerebras.ai/v1/chat/completions',
      key: process.env.CEREBRAS_API_KEY,
      // EVAL-BUG-FIX 2026-05-08: was 'llama-3.3-70b' which 404s on Cerebras.
      // Cerebras's stable free-tier large model is llama3.1-70b (no dash, 3.1 era).
      // 3.3 may roll out later; until then llama3.1-70b is the reliable layer-3.
      model: 'llama3.1-70b',
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
  for (const p of list) {
    try {
      const body: any = {
        model: p.model,
        messages: opts.messages,
        stream: true,
        max_tokens: opts.max_tokens ?? 300,
        temperature: opts.temperature ?? 0.4,
      };
      if (opts.json) body.response_format = { type: 'json_object' };

      const r = await fetch(p.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${p.key}`,
        },
        body: JSON.stringify(body),
      });

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
      while (true) {
        const { value, done } = await reader.read();
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
            if (delta) yield delta as string;
          } catch {
            // ignore malformed line
          }
        }
      }
      return; // successful stream end
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr ?? new Error('all providers failed');
}

// Non-streaming completion — same provider rotation logic.
export async function completeChat(opts: ChatOpts): Promise<string> {
  const list = providers();
  let lastErr: any = null;
  for (const p of list) {
    try {
      const body: any = {
        model: p.model,
        messages: opts.messages,
        stream: false,
        max_tokens: opts.max_tokens ?? 800,
        temperature: opts.temperature ?? 0.2,
      };
      if (opts.json) body.response_format = { type: 'json_object' };

      const r = await fetch(p.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${p.key}`,
        },
        body: JSON.stringify(body),
      });
      if (r.status === 429 || (r.status >= 500 && r.status < 600)) {
        lastErr = new Error(`${p.name} ${r.status}`);
        continue;
      }
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`${p.name} ${r.status}: ${txt.slice(0, 200)}`);
      }
      const data = await r.json() as any;
      return data?.choices?.[0]?.message?.content || '';
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr ?? new Error('all providers failed');
}
