import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/require-user';
import { withRetry } from '@/lib/supabase/with-retry';
import { SolveLayout } from '@/components/solve-layout';
import { InSolveHintPanel } from '@/components/in-solve-hint-panel';
import { SolveTour } from '@/components/solve-tour';
import type { Track } from '@/lib/tracks';
import { startSession } from '@/server-actions/start-session';
import { endSession } from '@/server-actions/end-session';
import { resetSession } from '@/server-actions/reset-session';

export default async function SolvePage({
  params, searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ session?: string; tutorial?: string }>;
}) {
  const { caseId } = await params;
  const { session: sessionParam, tutorial } = await searchParams;
  const isTutorial = tutorial === '1';
  const { supabase, user } = await requireUser();

  // Defensive guard: if no ?session= param, hand off to startSession which
  // performs its own redirect. The redirect throws a NEXT_REDIRECT signal; we
  // re-throw it so Next.js can navigate. Anything else gets caught and lands
  // us in the no-session fallback below (which redirects to /cases).
  if (!sessionParam) {
    try {
      await startSession(caseId);
    } catch (e) {
      // NEXT_REDIRECT must be re-thrown so the framework can act on it.
      if (e && typeof e === 'object' && 'digest' in e && typeof (e as { digest: unknown }).digest === 'string' && ((e as { digest: string }).digest).startsWith('NEXT_REDIRECT')) {
        throw e;
      }
      console.error('[solve] startSession failed:', e);
      redirect('/cases');
    }
    // If startSession returned without redirecting (shouldn't happen) we
    // can't safely render — bail to /cases so we never query with undefined.
    redirect('/cases');
  }

  const sessionId = sessionParam;
  let session: any = null;
  let caseRow: any = null;
  let cs: any = null;
  try {
    const [sessRes, caseRes, csRes] = await Promise.all([
      withRetry(() => supabase.from('sessions').select('*').eq('id', sessionId).single()),
      withRetry(() => supabase.from('cases').select('title, difficulty, problem_statement, source').eq('id', caseId).single()),
      withRetry(() => supabase.from('cheat_sheets').select('*').eq('session_id', sessionId).maybeSingle()),
    ]);
    session = sessRes.data;
    caseRow = caseRes.data;
    cs = csRes.data;
  } catch (e) {
    console.error('[solve] data fetch failed:', e);
    redirect('/cases');
  }

  if (!session || !caseRow) redirect('/cases');

  const initialMessages = ((session.transcript as any[]) ?? []).map((t) => ({
    role: t.role,
    content: t.content,
    // §7.1 Trust UX — forward optional citations so chat-panel can render
    // the "see why" footnote on Ash's resumed turns. Drops cleanly for
    // user turns and for legacy assistant turns that pre-date this field.
    ...(Array.isArray(t.citations) && t.citations.length > 0
      ? { citations: t.citations }
      : {}),
  }));
  const initialCs = cs ?? {
    framework: null, hypothesis: null, key_numbers: [],
    decisions: [], next_steps: [], manual_notes: null, locked_fields: [],
  };
  const ended = (session as any).ended_at != null;

  return (
    <main
      className="h-screen flex flex-col relative"
      style={{ background: 'var(--color-bg-canvas)' }}
    >
      <SolveLayout
        sessionId={sessionId}
        caseTitle={caseRow.title}
        caseDifficulty={caseRow.difficulty}
        caseSource={(caseRow as any).source ?? null}
        problemStatement={caseRow.problem_statement || ''}
        endSessionAction={endSession.bind(null, sessionId)}
        initialMessages={initialMessages as any}
        initialCs={initialCs as any}
        ended={ended}
      />
      <details
        className="px-5 py-1"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <summary className="meta-label cursor-pointer">
          Session stuck or broken? Reset.
        </summary>
        <form action={resetSession.bind(null, sessionId)} className="mt-2 mb-1">
          <p
            className="text-[11px] mb-1.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Clears the chat, tree, and cheat sheet for this session and starts you fresh on the same case. Your other sessions are unaffected.
          </p>
          <button
            type="submit"
            className="text-[11px] px-2 py-0.5 rounded font-mono uppercase tracking-[0.14em]"
            style={{
              background: 'transparent',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--color-signal-danger)',
              color: 'var(--color-signal-danger)',
            }}
          >
            ↺ reset this session
          </button>
        </form>
      </details>
      <span data-tour="solve-hint">
        <InSolveHintPanel track={(user.user_metadata?.preferred_track as Track) || 'consulting'} />
      </span>
      {isTutorial && <SolveTour />}
    </main>
  );
}
