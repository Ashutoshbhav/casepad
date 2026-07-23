// PracticeLiveLink — small "practice this case live (voice)" doorway into
// the hands-free /live-interview surface. A plain server component (no
// 'use client' needed): the bound server action works directly as a <form
// action>, which is the standard progressive-enhancement pattern for
// invoking a server action from a server-rendered tree — startLiveCaseInterview
// (src/server-actions/start-live-interview.ts) already exists and already
// accepts any case id; this is pure additive wiring, no new logic.
//
// Voice is now the PRIMARY action on /cases (see <HuprCaseRow> — the whole
// row is itself a <form>/<button> straight into a live session), so this
// component now only appears as the secondary/tertiary doorway on
// /solve/[caseId] (someone deliberately in the text flow who wants to
// switch to voice). Always render as a sibling of any other interactive
// element it's paired with — a <button> can't nest inside another
// <button>/<a> without breaking click targeting.

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
