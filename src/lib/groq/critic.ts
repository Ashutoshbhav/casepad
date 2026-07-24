// src/lib/groq/critic.ts
//
// Week-1 of AI-INTERVIEWER-TRAINING-PLAN: LLM-as-judge.
//
// After the deterministic guardrail (banned phrases + length cap) passes,
// a smaller/faster model (Llama 3.1-8b-instant) reviews the draft response
// on three SEMANTIC criteria that regex can't catch:
//
//   1. on_persona       — sounds like a Bain EM, not a coach/tutor/chatbot
//   2. not_generic      — specific to THIS candidate's last turn (not boilerplate)
//   3. ends_with_probe  — closes with a question, directive, or imperative
//
// Fail-open philosophy: any error in the critic itself (timeout, malformed
// JSON, all providers down) ships the original draft. The critic is an
// *enhancement*, never a blocker. NSM > critic-quality.
//
// Toggled via env vars:
//   ENABLE_SELF_CRITIQUE=false     — disable entirely (default: true)
//   CRITIC_TURN_INTERVAL=2         — run critic every Nth turn (default: 2)

import { completeChat } from '@/lib/llm-router';

export type CriticVerdict = {
  ok: boolean;
  failures: string[]; // human-readable fail reasons; empty when ok
  raw: string; // for telemetry
};

const SYSTEM_PROMPT = `You are a strict QA reviewer for an AI interviewer named Ash, a Bain Engagement Manager running case interviews.

Your job: evaluate the DRAFT response on 3 yes/no criteria. Be harsh — Ash should sound like a real EM, not a chatbot. Return ONLY valid JSON.

Criteria:
1. on_persona — Does this sound like a Bain EM (short, blunt, has a POV)? FAIL if it sounds like a coach, tutor, generic chatbot, validation-bait, or therapy mode.
2. not_generic — Is this response SPECIFIC to the candidate's last turn? FAIL if it could be copy-pasted into any case interview ("interesting point — what else would you consider?").
3. ends_with_probe — Does it end with a question, directive ("go", "show me", "walk me through"), or imperative? FAIL if it trails off, ends with affirmation, or hands the turn back without direction.

Return JSON ONLY in this exact schema. No prose before or after:
{"on_persona": true, "not_generic": true, "ends_with_probe": true, "fail_reason": ""}`;

export function shouldCritique(turnIndex: number): boolean {
  if (process.env.ENABLE_SELF_CRITIQUE === 'false') return false;
  const intervalRaw = parseInt(process.env.CRITIC_TURN_INTERVAL || '2', 10);
  const interval = Number.isFinite(intervalRaw) && intervalRaw > 0 ? intervalRaw : 2;
  return turnIndex % interval === 0;
}

export async function critiqueResponse(
  draft: string,
  lastUserTurn: string
): Promise<CriticVerdict> {
  // Guard against trivially-bad inputs without burning an LLM call.
  if (!draft || draft.trim().length === 0) {
    return { ok: false, failures: ['empty_draft'], raw: '' };
  }

  const userMsg = `CANDIDATE'S LAST TURN:\n${lastUserTurn.slice(0, 800)}\n\nDRAFT RESPONSE FROM ASH:\n${draft.slice(0, 800)}`;

  let raw = '';
  try {
    raw = await completeChat({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg },
      ],
      max_tokens: 120,
      temperature: 0.1,
      // 2026-07-24: this ran on Groq by default, meaning EVERY other turn
      // doubled the primary chat call's draw on Groq's shared 100K/day
      // budget for a side judgment, not the reply the candidate is
      // waiting on. tier:'aux' puts Cerebras first instead (separate
      // quota, ~700ms) — resolves the modelSize TODO in spirit without
      // needing a full model-routing feature.
      tier: 'aux',
    });
  } catch (err) {
    // Fail-open: never block the user on a critic outage.
    console.warn(`[critic] LLM call failed: ${(err as Error).message}; failing open`);
    return { ok: true, failures: [], raw: `error:${(err as Error).message.slice(0, 80)}` };
  }

  return parseCriticVerdict(raw);
}

export function parseCriticVerdict(raw: string): CriticVerdict {
  // Extract JSON from the response — model sometimes wraps in code fences.
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn(`[critic] no JSON in response; failing open. raw=${raw.slice(0, 120)}`);
    return { ok: true, failures: [], raw };
  }
  let parsed: any;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    console.warn(`[critic] JSON parse failed; failing open. raw=${raw.slice(0, 120)}`);
    return { ok: true, failures: [], raw };
  }

  const failures: string[] = [];
  if (parsed.on_persona === false) failures.push('on_persona');
  if (parsed.not_generic === false) failures.push('not_generic');
  if (parsed.ends_with_probe === false) failures.push('ends_with_probe');

  return {
    ok: failures.length === 0,
    failures,
    raw,
  };
}

export function regenHintForCritic(verdict: CriticVerdict): string {
  if (verdict.ok || verdict.failures.length === 0) return '';
  const reasons = verdict.failures
    .map((f) => {
      switch (f) {
        case 'on_persona':
          return 'Sound less like a coach/chatbot. Be Ash — short, blunt, EM voice.';
        case 'not_generic':
          return 'Get specific to the candidate\'s last turn. No boilerplate.';
        case 'ends_with_probe':
          return 'End with a probe — a question, directive, or "go". Never trail off.';
        case 'empty_draft':
          return 'Draft was empty. Produce a real Ash response.';
        default:
          return f;
      }
    })
    .join(' ');
  return `\n\n== CRITIC FEEDBACK (regen) ==\nYour last draft failed QA: ${reasons} Rewrite. Same input, fix these issues. Keep all other rules — and your response MUST end with a question (?) or a directive ("Go.", "Walk me through.", "Try again.") — never trail off with a period.`;
}
