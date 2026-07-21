// PracticeLiveLink — small "practice this case live (voice)" doorway into
// the hands-free /live-interview surface, dropped next to the existing
// text-flow entry points on /cases and /solve. A plain server component
// (no 'use client' needed): the bound server action works directly as a
// <form action>, which is the standard progressive-enhancement pattern for
// invoking a server action from a server-rendered tree — startLiveCaseInterview
// (src/server-actions/start-live-interview.ts) already exists and already
// accepts any case id; this is pure additive wiring, no new logic.
//
// Deliberately NOT nested inside the existing <CaseListLink> in
// <HuprCaseRow> (or any other whole-row anchor) — a <button> inside an <a>
// is invalid HTML and would fight the outer link for clicks. Always render
// this as a sibling of the row/anchor it's paired with.

import { startLiveCaseInterview } from '@/server-actions/start-live-interview';

export function PracticeLiveLink({ caseId, className }: { caseId: string; className?: string }) {
  return (
    <form action={startLiveCaseInterview.bind(null, caseId)} className={className}>
      <button
        type="submit"
        className="hupr-mono-eyebrow underline"
        style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--color-text-secondary)' }}
      >
        ▷ Practice live (voice)
      </button>
    </form>
  );
}
