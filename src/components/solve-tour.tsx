'use client';

import { TourOverlay, type TourStep } from './tour-overlay';

const STEPS: TourStep[] = [
  {
    target: 'solve-header',
    title: 'Read the prompt',
    body: 'The case title and difficulty are here. Scroll to the bottom of the page and click "Show problem statement" to read the full prompt before you start talking.',
  },
  {
    target: 'solve-crammer',
    title: 'Pre-case crammer (30 sec)',
    body: 'Click this for a quick industry primer specific to this case — likely frameworks, math shortcuts, watch-outs, and a recovery script. Use it BEFORE you start; one of your free moves.',
  },
  {
    target: 'solve-chat',
    title: 'Talk to the interviewer',
    body: 'Type your clarifying questions, your structure, your hypotheses, your math here. Just like a real case — turn-by-turn dialogue. Press Enter or Send to send. The interviewer streams a response.',
  },
  {
    target: 'solve-sheet',
    title: 'Live cheat sheet (auto-fills)',
    body: 'As you talk in chat, this panel auto-fills: framework you chose, hypothesis, key numbers you mentioned, decisions, next steps. You can also pin manual notes. No need to fill it yourself.',
  },
  {
    target: 'solve-hint',
    title: 'Stuck? ⚡ Hint',
    body: 'The floating ⚡ button (bottom-right) opens recovery scripts, frameworks, math formulas, and killer phrases for the L4 spike move. Use sparingly — interviewer dings candidates who pull out cheat sheets too often.',
  },
  {
    target: 'solve-end',
    title: 'End → debrief',
    body: 'When you\'ve delivered a recommendation (or you give up), click End session. You\'ll see a score, dimension breakdown, gaps, and an ideal walkthrough comparing your moves to the expert path.',
  },
];

export function SolveTour() {
  return <TourOverlay steps={STEPS} storageKey="casepad-solve-tour-seen" />;
}
