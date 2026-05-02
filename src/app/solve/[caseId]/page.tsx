import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  if (!sessionParam) {
    await startSession(caseId);
  }

  const sessionId = sessionParam!;
  const { data: session } = await withRetry(() =>
    supabase.from('sessions').select('*').eq('id', sessionId).single()
  );
  const { data: caseRow } = await withRetry(() =>
    supabase.from('cases').select('title, difficulty, problem_statement').eq('id', caseId).single()
  );
  const { data: cs } = await withRetry(() =>
    supabase.from('cheat_sheets').select('*').eq('session_id', sessionId).maybeSingle()
  );

  if (!session || !caseRow) redirect('/cases');

  const initialMessages = ((session.transcript as any[]) ?? []).map((t) => ({
    role: t.role, content: t.content,
  }));
  const initialCs = cs ?? {
    framework: null, hypothesis: null, key_numbers: [],
    decisions: [], next_steps: [], manual_notes: null, locked_fields: [],
  };

  return (
    <main className="h-screen flex flex-col bg-zinc-950 relative">
      <header data-tour="solve-header" className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-zinc-500 uppercase">{caseRow.difficulty}</div>
          <h1 className="text-sm font-semibold">{caseRow.title}</h1>
        </div>
        <form action={endSession.bind(null, sessionId)} data-tour="solve-end">
          <button className="text-xs px-3 py-1.5 bg-rose-900/40 text-rose-300 rounded">End session</button>
        </form>
      </header>
      <SolveLayout
        sessionId={sessionId}
        initialMessages={initialMessages as any}
        initialCs={initialCs as any}
      />
      <details className="border-t border-zinc-800 px-4 py-2">
        <summary className="text-xs text-zinc-500 cursor-pointer">Show problem statement</summary>
        <p className="text-sm text-zinc-400 mt-2">{caseRow.problem_statement}</p>
      </details>
      <details className="border-t border-zinc-900 px-4 py-1">
        <summary className="text-[11px] text-zinc-600 cursor-pointer">Session stuck or broken? Reset.</summary>
        <form action={resetSession.bind(null, sessionId)} className="mt-2 mb-1">
          <p className="text-[11px] text-zinc-500 mb-1.5">Clears the chat, tree, and cheat sheet for this session and starts you fresh on the same case. Your other sessions are unaffected.</p>
          <button type="submit" className="text-[11px] px-2 py-0.5 rounded bg-rose-950/50 text-rose-400 border border-rose-900/50 hover:bg-rose-900/30">↺ reset this session</button>
        </form>
      </details>
      <span data-tour="solve-hint">
        <InSolveHintPanel track={(user.user_metadata?.preferred_track as Track) || 'consulting'} />
      </span>
      {isTutorial && <SolveTour />}
    </main>
  );
}
