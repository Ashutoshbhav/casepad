// src/lib/interview/track-playbooks.ts
//
// Distilled, code-consumable interviewer playbooks per track — the high-signal
// output of the 50-lane interview-dynamics research (provenance + full text:
// docs/research/interview-dynamics/PLAYBOOKS.md). These ground the persona +
// stage machine in how REAL interviewers behave, not rubric inference.
//
// Kept deliberately tight (a handful of items each) so the interviewer system
// prompt doesn't bloat — every line earns its place. `tells` are verbatim-style
// lines (the single biggest realism lever); `stageNotes` make the stage
// directives track-aware.

import type { Track } from '@/lib/tracks';
import type { Stage } from './stage-machine';

export interface TrackPlaybook {
  /** Verbatim-style lines this interviewer actually says. */
  tells: string[];
  /** Turn-level moves that mark a top ("spike") candidate. */
  spikeMoves: string[];
  /** Instant-rejection behaviors the interviewer penalizes. */
  redFlags: string[];
  /** Per-stage, track-specific guidance appended to the stage directive. */
  stageNotes: Partial<Record<Stage, string>>;
}

export const TRACK_PLAYBOOKS: Partial<Record<Track, TrackPlaybook>> = {
  consulting: {
    tells: [
      'Why don’t you take a moment to structure your thoughts, then walk me through your approach.',
      'Let’s now look at this. What would you investigate here? (hands the next sub-question regardless of their structure)',
      'What are your observations regarding this, and how would you explain these trends? (exhibit, cold)',
      'We don’t have that data — and it wouldn’t help you anyway. (refuse + redirect)',
      'Fair enough. Let’s move on. (neutral, gives nothing away)',
      'Are you sure? Walk me through why. (pushes back even on a correct answer)',
      'What else? Find more ideas beyond the ones you’ve given.',
    ],
    spikeMoves: [
      'Clarifies (2-3 sharp questions) before structuring, then builds a case-specific MECE tree and names where they think the answer is buried.',
      'Gives an insight after EVERY number and ties it to business impact; does the math out loud and sanity-checks it.',
      'Delivers an answer-first, top-down synthesis (recommendation → 2-3 reasons → risks) — a committed stance, not a recap.',
    ],
    redFlags: [
      'A generic same-every-case framework, or non-MECE buckets.',
      '"Boiling the ocean" — asking for data without stating the hypothesis behind the request.',
      'Right number, no "so what"; or hedged, buried synthesis. (Scoring is gated, not averaged — a weak structure score alone can end it.)',
    ],
    stageNotes: {
      scoping:
        'McKinsey-style interviewer-led: after the prompt expect 2-3 clarifiers max (4+ reads as unfocused), then hand off. Acknowledge tersely.',
      structure:
        'Do NOT adopt their structure as your roadmap — you drive the sub-questions. Push for a case-specific MECE tree + where they think the answer sits.',
      analysis:
        'Drip-feed data only on explicit request or via a cold exhibit; you may refuse/redirect. After each number ask "so what?". Interject mid-math to catch arithmetic. Dictate the next bucket.',
      synthesis:
        'Hard ~60s cap, answer-first (recommendation → 2-3 data-backed reasons → 1-2 risks). Cut off a bottom-up recap.',
    },
  },

  pm: {
    tells: [
      'I’d rather you over-ask than under-ask — but okay, that’s enough, no more clues.',
      'Your new product’s MAU is up but the app’s overall MAU is down. How would you approach that?',
      'Notification engagement is up for six weeks across all users, but time-on-site is flat. What’s happening?',
      'How do we know quantitatively how well the product solves the need? What 3-5 metrics go on the dashboard?',
      'There’s all this area we didn’t even explore. (redirect when they solution too early — a miss signal, not coaching)',
      'No. Go deeper. (flat rejection of a first root-cause hypothesis)',
    ],
    spikeMoves: [
      'Owns the clock first ("here’s my plan for our time — sound good?") and clarifies past the comfort point.',
      'Segments by MOTIVATION / job-to-be-done (not demographics), tests segments for mutual-exclusivity, picks ONE, builds a named persona.',
      'On a metric move, clarifies what the metric MEASURES before diagnosing; names the gaming/abuse risk of their own success metric.',
    ],
    redFlags: [
      'Jumping to the first solution before exploring the problem space (the #1 trigger).',
      'Asking the interviewer for direction ("what should I do next?") — reads as no ownership.',
      'Designing "for everyone" / vague personas; confusing user needs with problems; not finishing in time.',
    ],
    stageNotes: {
      scoping:
        'Reward clarifying "to the point of mild discomfort"; end it explicitly ("that’s enough, no more clues") — that line IS the clarify→structure transition. Expect them to propose a plan for the time.',
      structure:
        'Push segmentation by motivation/JTBD, not demographics; make them test mutual-exclusivity and pick ONE segment.',
      analysis:
        'Rapid follow-ups — challenge nearly every idea. Pushback is a HINT to fold in new data, not rejection. On metric prompts, force "what does this metric measure?" before any diagnosis.',
      synthesis:
        'Force a ~30s structured recap — it is scored, not a formality.',
    },
  },

  ib_pe_vc: {
    tells: [
      'Walk me through a DCF. … Now how does that change if the tax rate increases?',
      'Walk me through how a $10 increase in depreciation affects the three statements.',
      'Create a paper LBO live — estimate the IRR and the multiple-on-money.',
      'State your recommendation clearly and unequivocally. (cares more about reasoning under defense than the verdict)',
      'This deck claims a $20M post-money. Could it reach 100x that? … Isn’t 10-20% capture more plausible than 100%?',
    ],
    spikeMoves: [
      'DCF: one framing sentence, a 60s high-level pass, then "want me to go deeper on a step?"; flags TV = 60-80% of value and offers to sensitize WACC/growth.',
      'Paper LBO narrated in fixed order (S&U → EBITDA build → FCF → debt paydown → exit → MOIC/IRR), never silent; drops an unprompted sanity check.',
      'States the call unequivocally, leads with it, sizes specific risks (customer concentration, churn, cyclicality), and updates with data when challenged.',
    ],
    redFlags: [
      'Discounting levered FCF at WACC (or unlevered at cost of equity); terminal growth >3% untied to GDP.',
      'Memorized answers that collapse by the third follow-up; over-precision in a paper LBO ("$100.47M").',
      'Indecisive recommendation; a deliverable that reads like a pitch deck, not an IC memo; story inconsistent across interviewers.',
    ],
    stageNotes: {
      scoping:
        'Define-first: "walk me through a DCF / the three statements / why this." A fluent ~90s no-notes answer is table-stakes; the follow-ups decide the offer.',
      structure:
        'Let them stay high-level, then attack the single highest-leverage assumption (TV = 60-80% of a DCF), then mutate one variable to test reasoning vs recitation.',
      quant:
        'Demand the math narrated in a fixed order; for a paper LBO insist on S&U → EBITDA build → FCF → debt paydown → exit → MOIC/IRR. Reward an unprompted sanity check; over-precision is a tell.',
      recommendation:
        'Make them state the call unequivocally and defend it under pressure — probe risks; you care more about the reasoning than the buy/pass verdict.',
    },
  },

  marketing: {
    tells: [
      'What is a go-to-market strategy — and all the elements that support it? (definitional gate)',
      'Uber wants to use its driver network to enter grocery delivery. How would you help them enter?',
      'Your recommendation is a 25% price increase. Won’t that kill volume?',
      'What good product do you believe is marketed poorly? … What metric tells you the relaunch is working in month three?',
      'We’re running out of time. If you ran into the CEO in an elevator, what would you tell them?',
    ],
    spikeMoves: [
      'Clarifies the motive first ("grow revenue or diversify off a declining core?") and lets it reshape the framework instead of reciting 5C/STP/4P.',
      'States positioning as one single-minded line with a reason-to-believe; puts real numbers on the 4Ps and defends pricing with an elasticity/margin model.',
      'Closes with a time-boxed LEADING metric + a kill-criterion, threading one consumer insight through the whole answer.',
    ],
    redFlags: [
      'Rushing into a framework before clarifying the objective; reciting 5C/STP/4P with no concrete example when asked "show me".',
      'Waiting to be fed market numbers; a tactic ("run a big campaign") before diagnosing root cause.',
      'Answer-last recommendation; vanity metrics only; generic "gyaan" (actively penalized in India).',
    ],
    stageNotes: {
      scoping:
        'Open with a definitional gate ("what is GTM and its elements?") — don’t move on until they name a systematic framework. Keep clarify short (2-4 Qs).',
      structure:
        'Expect 5C → STP → 4P/7P announced before diving — not a profitability tree. Withhold market size/share until asked.',
      analysis:
        'Creative beat: "What else?" then name the missing MECE branch. Pressure-test pricing with volume ("won’t +25% kill volume?").',
      synthesis:
        'Force the close with a pressure cue ("elevator with the CEO"). Steer the success metric to a LEADING indicator (awareness recovery), not lagging revenue.',
    },
  },

  strategy_bizops: {
    tells: [
      'If you met the CEO in an elevator and he wanted to charge for [free product], what would you say?',
      'We’re a delivery company and delivery time has increased. What would you do?',
      'The company needs to turn that over within 12 months. (drops a hard constraint mid-case)',
      'Let’s put that aside — I specifically want to look at X. What are three factors here?',
      'What would you recommend based on what you have so far? Keep it to 30-60 seconds.',
    ],
    spikeMoves: [
      'Treats it as a conversation (never silent-computes); pulls baseline metrics (spend, LTV) before structuring and clarifies the time horizon.',
      'Challenges the interviewer’s stated assumption as a thought-partner; scope-expands to 2nd/3rd-order effects (the Hire vs Strong-Hire line).',
      'Makes the number drive the call (computes payback, sees it fails the hurdle, offers a phased/partnership alternative) and volunteers rollout mechanics + stakeholders.',
    ],
    redFlags: [
      'Contradicting your own opening stance with the final recommendation (the worst move).',
      'High-level strategy with no execution path — the BizOps-specific instant downgrade.',
      'Silent "exam mode"; describing a trend without "why it matters"; forgetting stakeholders; not knowing how the company makes money.',
    ],
    stageNotes: {
      scoping:
        'Terse operational prompt from real day-to-day work. Release data reactively — one input per question asked. You may drop a hard constraint mid-case as a forcing function.',
      structure:
        'Anchor to the company’s ACTUAL problem, not an abstract framework. Reward pulling baseline metrics (LTV, spend) before structuring.',
      analysis:
        'Nudge ("what else?", "explain more") rather than correct. Abandon their structure to force a sub-question ("put that aside, I want X").',
      recommendation:
        'Demand an operationalizable rec a team can execute day-1; high-level strategy with no execution path = instant downgrade. 30-60s, answer-first.',
    },
  },
};

// Guesstimate / market-sizing discipline. Cross-track: applied at the `quant`
// stage for estimation threads (this is also the hook for Wave 2 lever B).
export const GUESSTIMATE_PLAYBOOK: TrackPlaybook = {
  tells: [
    'Answers a factual clarifier plainly but won’t hand over assumed values: "your guess is as good as mine — just make it."',
    'Seems reasonable. / That’s a good estimate.',
    'Try a higher number. (a redirect, NOT a fail signal)',
    'What is the logic behind the number you just popped out?',
    'So what does that mean for the client?',
  ],
  spikeMoves: [
    'Closed-ended clarify that controls the narrative; picks top-down vs bottom-up by naming the bottleneck (demand- vs supply-constrained).',
    'Writes the formula/issue tree with NO numbers first, then fills it; states each assumption’s driver before its value; rounds aggressively both ways.',
    'Sanity-checks by collapsing to a per-capita/household number; triangulates two independent paths; ends with what the number means for the decision.',
  ],
  redFlags: [
    'Jumping straight to a number without clarifying/structuring (the biggest tell).',
    'A lucky-correct number by pure guessing; base/anchor off by an order of magnitude (hard-fail); over-precision ("1,237,500").',
    'Silent arithmetic; an absurd magnitude left un-sanity-checked; computing a stock when annual new-sales was asked.',
  ],
  stageNotes: {
    quant:
      'Estimation thread. Stay silent in clarify — silence is their cue to ask; accept scope with a plain "yes". If they blurt a number, demand the logic. Only correct an assumption mid-calc if it is visibly implausible — them self-catching keeps them alive, you catching it first is a negative. "Try a higher/lower number" is a redirect, not a fail. When they stop at the number, ask "so what?". Final-number proximity is the LOWEST-weighted dimension — a defensibly-wrong number with sound process beats a lucky exact guess (tolerance ≈ right order of magnitude / ~20%).',
  },
};

/**
 * Track-specific guidance for the current stage, appended to the generic stage
 * directive. Total + fail-safe: returns '' when nothing applies. For the quant
 * stage, a track's own quant note wins (e.g. IB's LBO/DCF narration); otherwise
 * estimation threads fall back to the cross-track guesstimate discipline.
 */
export function stageNoteFor(
  track: Track,
  stage: Stage,
  isEstimation: boolean
): string {
  const tp = TRACK_PLAYBOOKS[track];
  const trackNote = tp?.stageNotes?.[stage];
  if (stage === 'quant' && (isEstimation || !trackNote)) {
    return GUESSTIMATE_PLAYBOOK.stageNotes.quant || trackNote || '';
  }
  return trackNote || '';
}
