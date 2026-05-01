// src/lib/groq/client.ts
import Groq from 'groq-sdk';

// NOTE: This file is intentionally NOT marked `'server-only'` because it is
// also imported from tsx scripts in the ingestion pipeline (Plan B). It is
// only ever imported from server contexts (API routes + scripts), never from
// client components — verified before relaxing the guard.

let _client: Groq | null = null;

function getGroq(): Groq {
  if (_client) return _client;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set in env. Set it in .env.local or your shell.');
  }
  _client = new Groq({ apiKey });
  return _client;
}

// Proxy keeps `groq.chat.completions.create(...)` syntax working at every call site.
export const groq: Groq = new Proxy({} as Groq, {
  get(_target, prop, receiver) {
    return Reflect.get(getGroq(), prop, receiver);
  },
});

// DEVIATION: The plan specified `llama-3.1-70b-versatile`, but groq-sdk@1.1.2
// (see node_modules/groq-sdk/resources/chat/completions.d.ts) only lists
// `llama-3.3-70b-versatile` for the 70B-class versatile model. The 3.1-70b
// variant has been retired by Groq. Using the SDK-supported successor.
export const MODEL_LARGE = 'llama-3.3-70b-versatile';
export const MODEL_SMALL = 'llama-3.1-8b-instant';
