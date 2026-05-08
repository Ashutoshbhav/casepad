// src/lib/groq/guardrails.ts
//
// Output-layer guardrails for the AI interviewer. Runs after Llama generates
// a draft response; rejects on banned-phrase prefixes or >80-word length cap.
// Day-2-3 of the AI-INTERVIEWER-TRAINING-PLAN — defends the system-prompt
// rules deterministically rather than trusting the model to follow them
// every time.
//
// Mode is controlled by GUARDRAIL_MODE env var:
//   "gate"    (default) — buffer the response, validate, regen once on fail
//   "monitor"           — stream optimistically, log failures, don't regen
//   "off"               — disable entirely (escape hatch)

const BANNED_PHRASE_PREFIXES = [
  'great question',
  "that's a fantastic point",
  'that is a fantastic point',
  'let me walk you through',
  "i'd be happy to help",
  'i would be happy to help',
  'excellent observation',
  'absolutely!',
  'here are 3 reasons',
  'here are 4 reasons',
  'here are 5 reasons',
  'here are three reasons',
  'here are four reasons',
  'here are five reasons',
  'here are 3 ways',
  'here are 4 ways',
  'here are 5 ways',
  'here are 3 factors',
  'here are 4 factors',
  'here are 5 factors',
  'as an ai',
  "i'm here to help",
  'i am here to help',
] as const;

const WORD_CAP = 80;

export type GuardrailFailure =
  | { type: 'banned_phrase'; phrase: string }
  | { type: 'too_long'; wordCount: number };

export type GuardrailResult = { ok: true } | { ok: false; failure: GuardrailFailure };

export type GuardrailMode = 'gate' | 'monitor' | 'off';

export function getGuardrailMode(): GuardrailMode {
  const raw = (process.env.GUARDRAIL_MODE || 'gate').toLowerCase();
  if (raw === 'monitor' || raw === 'off' || raw === 'gate') return raw;
  return 'gate';
}

export function checkResponse(text: string): GuardrailResult {
  if (!text || !text.trim()) return { ok: true };
  const normalized = text.toLowerCase();
  for (const phrase of BANNED_PHRASE_PREFIXES) {
    if (normalized.includes(phrase)) {
      return { ok: false, failure: { type: 'banned_phrase', phrase } };
    }
  }
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > WORD_CAP) {
    return { ok: false, failure: { type: 'too_long', wordCount } };
  }
  return { ok: true };
}

export function regenHintFor(failure: GuardrailFailure): string {
  if (failure.type === 'banned_phrase') {
    return `\n\n== REGEN HINT ==\nYour last draft contained the banned phrase "${failure.phrase}" (or a prefix of it). Rewrite without that phrase. Keep all other rules — short, blunt, end with a probe.`;
  }
  return `\n\n== REGEN HINT ==\nYour last draft was ${failure.wordCount} words — exceeds the 80-word hard cap. Rewrite under 80 words. Keep all other rules.`;
}

export function describeFailure(f: GuardrailFailure): string {
  return f.type === 'banned_phrase'
    ? `banned_phrase:"${f.phrase}"`
    : `too_long:${f.wordCount}w`;
}
