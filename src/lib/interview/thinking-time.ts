// thinking-time.ts — detects when a candidate has explicitly asked for a
// moment to structure their thoughts, so the turn-taking machinery can back
// off instead of treating it like any other turn to respond to. Two
// independent consumers:
//   - src/app/api/chat/route.ts: appends a one-turn directive telling the
//     interviewer to briefly acknowledge and NOT ask a new question this
//     turn (same fail-open injection pattern as isCannedTemplate).
//   - src/components/live-mic-input.tsx: widens the VAD's pause tolerance
//     for a grace window so halting/muttering "thinking out loud" speech
//     doesn't fragment into several separate auto-sent turns.
//
// Regex/keyword detection, not an LLM call — mirrors this codebase's
// existing convention for turn-level intent signals (see stage-machine.ts's
// STRUCTURE_RE/MATH_RE, canned-templates.ts's exact-match check). Cheap,
// zero added latency, no extra Groq TPM.

const THINKING_TIME_PATTERNS: RegExp[] = [
  /\bgive me (a|one|two|a few) (moment|second|minute)s?\b/i,
  /\b(let|allow) me (think|structure|organize|gather|collect) (my|this)?\s*(thoughts?|for a (second|moment|minute))?\b/i,
  /\bneed (a|one|two|a few) (moment|second|minute)s? to\b/i,
  /\b(a )?(moment|second|minute) to (think|structure|organize|gather)\b/i,
  /\bstructure my (thoughts|thinking|approach)\b/i,
  /\bbear with me\b/i,
  /\bjust thinking (out loud|through this)\b/i,
  /\btake a (moment|second|minute|beat)\b/i,
  /\blet me (think|process) (this|that)? ?(through|for a (second|moment))?\b/i,
];

export function isThinkingTimeRequest(text: string): boolean {
  try {
    const trimmed = text.trim();
    if (!trimmed) return false;
    return THINKING_TIME_PATTERNS.some((re) => re.test(trimmed));
  } catch {
    // Defensive: never let a detection bug block a turn or a mic decision.
    return false;
  }
}
