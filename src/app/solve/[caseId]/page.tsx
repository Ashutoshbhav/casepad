import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ChatPanel } from '@/components/chat-panel';
import { CheatSheetPanel } from '@/components/cheat-sheet-panel';
import { PreCaseCrammerPanel } from '@/components/pre-case-crammer-panel';
import { InSolveHintPanel } from '@/components/in-solve-hint-panel';
import type { Track } from '@/lib/tracks';
import { startSession } from '@/server-actions/start-session';
import { endSession } from '@/server-actions/end-session';

export default async function SolvePage({
  params, searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { caseId } = await params;
  const { session: sessionParam } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  if (!sessionParam) {
    await startSession(caseId);
  }

  const sessionId = sessionParam!;
  const { data: session } = await supabase
    .from('sessions').select('*').eq('id', sessionId).single();
  const { data: caseRow } = await supabase
    .from('cases').select('title, difficulty, problem_statement, pre_case_crammer').eq('id', caseId).single();
  const { data: cs } = await supabase
    .from('cheat_sheets').select('*').eq('session_id', sessionId).maybeSingle();

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
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-zinc-500 uppercase">{caseRow.difficulty}</div>
          <h1 className="text-sm font-semibold">{caseRow.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <PreCaseCrammerPanel caseId={caseId} initial={(caseRow.pre_case_crammer as any) || null} />
          <form action={endSession.bind(null, sessionId)}>
            <button className="text-xs px-3 py-1.5 bg-rose-900/40 text-rose-300 rounded">End session</button>
          </form>
        </div>
      </header>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-x divide-zinc-800 overflow-hidden">
        <ChatPanel sessionId={sessionId} initial={initialMessages as any} />
        <CheatSheetPanel sessionId={sessionId} initial={initialCs as any} />
      </div>
      <details className="border-t border-zinc-800 px-4 py-2">
        <summary className="text-xs text-zinc-500 cursor-pointer">Show problem statement</summary>
        <p className="text-sm text-zinc-400 mt-2">{caseRow.problem_statement}</p>
      </details>
      <InSolveHintPanel track={(user.user_metadata?.preferred_track as Track) || 'consulting'} />
    </main>
  );
}
