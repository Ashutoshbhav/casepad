// src/lib/groq/client.ts
import Groq from 'groq-sdk';

// NOTE: This file is intentionally NOT marked `'server-only'` because it is
// also imported from tsx scripts in the ingestion pipeline (Plan B). It is
// only ever imported from server contexts (API routes + scripts), never from
// client components — verified before relaxing the guard.

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// DEVIATION: The plan specified `llama-3.1-70b-versatile`, but groq-sdk@1.1.2
// (see node_modules/groq-sdk/resources/chat/completions.d.ts) only lists
// `llama-3.3-70b-versatile` for the 70B-class versatile model. The 3.1-70b
// variant has been retired by Groq. Using the SDK-supported successor.
export const MODEL_LARGE = 'llama-3.3-70b-versatile';
export const MODEL_SMALL = 'llama-3.1-8b-instant';
