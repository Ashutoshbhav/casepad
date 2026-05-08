// src/lib/groq/recent-turn-context.ts
//
// Recent-Turn Awareness + Phrase Cooldown — anti-repetition pattern.
// Per docs/research/LLM-PERSONA-CONSISTENCY.md: production case study
// (Tony Seah) took repetition rate 15% → 0% by injecting "your last 3
// responses were ..." into the system prompt with explicit anti-repeat
// instruction. Validated by Lost-in-the-Middle (Liu et al. 2023): the END
// of the prompt is high-attention for Llama 3.x.

interface Turn {
  role: string;
  content: string;
}

/**
 * Render the last 3 Ash turns as a system-prompt block telling the model
 * NOT to repeat phrases from these. Empty string if there are <2 prior
 * Ash turns (nothing to repeat against yet).
 */
export function renderRecentTurnAwareness(transcript: Turn[]): string {
  const ashTurns = transcript.filter((t) => t.role === 'interviewer');
  if (ashTurns.length < 2) return '';

  const lastN = ashTurns.slice(-3);
  const lines = lastN.map((t, i) => `  [Ash turn -${lastN.length - i}]: ${t.content}`);

  return `\n\n== RECENT ASH TURNS — do NOT reuse any 4-word phrase from these. Each turn must be linguistically distinct. ==\n${lines.join('\n')}\n== END RECENT ==`;
}

/**
 * Deterministic phrase-cooldown check. Looks at last 5 Ash turns and the
 * draft response; if the draft contains any 4-word phrase that appears in
 * the recent history, returns the offending phrase.
 *
 * Returns null if clean. Caller should regen on hit.
 */
export function findRepeatedPhrase(
  draft: string,
  transcript: Turn[]
): string | null {
  const ashTurns = transcript.filter((t) => t.role === 'interviewer').slice(-5);
  if (ashTurns.length === 0) return null;

  const draftGrams = ngrams(draft, 4);
  for (const t of ashTurns) {
    const tGrams = ngrams(t.content, 4);
    for (const g of draftGrams) {
      if (tGrams.has(g) && g.length > 15 && !isStopwordGram(g)) {
        return g;
      }
    }
  }
  return null;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'be', 'i', 'you', 'we', 'it', 'and', 'or',
  'but', 'in', 'on', 'at', 'to', 'of', 'for', 'with', 'as', 'this', 'that',
  'do', 'does', 'did', 'will', 'would', 'should', 'can', 'have', 'has', 're',
  'what', 'why', 'how', 'when', 'where', 'who',
]);

function isStopwordGram(g: string): boolean {
  const tokens = g.split(' ');
  return tokens.every((t) => STOPWORDS.has(t));
}

function ngrams(text: string, n: number): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const grams = new Set<string>();
  for (let i = 0; i + n <= tokens.length; i++) {
    grams.add(tokens.slice(i, i + n).join(' '));
  }
  return grams;
}

/**
 * Build a regen-hint message for when the deterministic phrase-cooldown
 * fires. Per the persona-consistency research, the regen prompt should
 * (a) drop the bad draft entirely, (b) put the user's verbatim latest
 * turn at the END of the system prompt, (c) frame the constraint as
 * forward-looking, not backward-looking commentary.
 */
export function regenHintForPhraseRepeat(repeatedPhrase: string): string {
  // 2026-05-08 update: explicit probe-end requirement added so the regen
  // doesn't lose the "always end with a probe" baseline rule while focused
  // on fixing the repeat. Eval found this was the dominant remaining failure
  // mode — drafts dropping the probe under regen pressure.
  return `\n\n== ANTI-REPEAT CONSTRAINT (this turn only) ==\nYou previously used the phrase "${repeatedPhrase}" in a recent turn. Do NOT reuse it. Write the next turn from scratch with different vocabulary. Same intent, different phrasing. Your response MUST still end with a question (?) or a directive ("Go.", "Walk me through.", "Try again.") — never trail off with a period.`;
}
