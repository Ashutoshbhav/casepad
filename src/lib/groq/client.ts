// src/lib/groq/client.ts
import Groq from 'groq-sdk';

// NOTE: This file is intentionally NOT marked `'server-only'` because it is
// also imported from tsx scripts in the ingestion pipeline (Plan B). It is
// only ever imported from server contexts (API routes + scripts), never from
// client components — verified before relaxing the guard.

let _client: Groq | null = null;

function getGroq(): Groq {
  if (_client) return _client;
  // LLM_BASE_URL lets us point the OpenAI-compatible Groq SDK at any other
  // OpenAI-compatible server (NVIDIA NIM, Ollama, Cerebras, etc.) so ingest
  // can run for free with no daily caps. Picks the right API key based on
  // which provider is configured.
  const baseURL = process.env.LLM_BASE_URL;
  let apiKey: string;
  if (baseURL?.includes('nvidia.com')) {
    apiKey = process.env.NVIDIA_API_KEY || '';
  } else if (baseURL?.includes('localhost') || baseURL?.includes('127.0.0.1')) {
    apiKey = 'ollama-local';
  } else {
    apiKey = process.env.GROQ_API_KEY || '';
  }
  if (!apiKey && !baseURL?.includes('localhost')) {
    throw new Error('No API key for the configured LLM provider. Set GROQ_API_KEY, NVIDIA_API_KEY, or LLM_BASE_URL=http://localhost:11434/v1 for Ollama.');
  }
  _client = new Groq({ apiKey, baseURL });
  return _client;
}

// Proxy keeps `groq.chat.completions.create(...)` syntax working at every call site.
export const groq: Groq = new Proxy({} as Groq, {
  get(_target, prop, receiver) {
    return Reflect.get(getGroq(), prop, receiver);
  },
});

// When LLM_BASE_URL points to a local OpenAI-compatible server (e.g. Ollama),
// we swap the hosted Groq model names for whatever's loaded locally. The
// LLM_LOCAL_MODEL env var lets ops choose without code changes.
const isLocal = !!process.env.LLM_BASE_URL;
const localModel = process.env.LLM_LOCAL_MODEL || 'llama3.1:8b';

// 2026-09-07: Groq deprecated its entire Llama line — `llama-3.3-70b-versatile`
// and `llama-3.1-8b-instant` both return model_not_found now (verified against
// GET /openai/v1/models). Its only remaining PLAIN instruct model (no hidden
// reasoning tokens, so it's a drop-in for raw `groq.chat.completions.create`
// call sites that don't pass `reasoning_effort`) is `qwen/qwen3.8-27b` —
// verified live, returns clean content with no <think> leak. The gpt-oss-*
// models Groq now hosts DO emit hidden reasoning and would need the
// reasoning_effort + max_tokens-floor handling the router applies; not safe as
// a bare const here. LARGE and SMALL therefore converge for now (Groq no
// longer offers a fast 8B tier). `llm-router.ts` uses gpt-oss-120b for the
// primary interviewer turn where it can apply that handling.
export const MODEL_LARGE = isLocal ? localModel : 'qwen/qwen3.8-27b';
export const MODEL_SMALL = isLocal ? localModel : 'qwen/qwen3.8-27b';
