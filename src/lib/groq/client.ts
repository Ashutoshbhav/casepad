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

export const MODEL_LARGE = isLocal ? localModel : 'llama-3.3-70b-versatile';
export const MODEL_SMALL = isLocal ? localModel : 'llama-3.1-8b-instant';
