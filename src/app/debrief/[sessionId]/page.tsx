import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ScoreBar } from '@/components/score-bar';
import { IdealStructureTree } from '@/components/ideal-structure-tree';
import { IdealWalkthroughView } from '@/components/ideal-walkthrough';
import { generateIdealWalkthrough } from '@/lib/groq/walkthrough';
import { SessionFeedbackForm } from '@/components/session-feedback-form';

export default async function DebriefPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: session } = await supabase
    .from('sessions').select('*').eq('id', sessionId).single();
  if (!session) redirect('/cases');
  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, title, ideal_structure, problem_statement, interviewer_notes, ideal_walkthrough')
    .eq('id', session.case_id)
    .single();

  // Lazy-generate the ideal walkthrough on first debrief view, then cache.
  let walkthrough = caseRow?.ideal_walkthrough as any;
  if (caseRow && !walkthrough) {
    walkthrough = await generateIdealWalkthrough(
      caseRow.title,
      caseRow.problem_statement || '',
      caseRow.ideal_structure || {},
      (caseRow.interviewer_notes as any[]) || []
    );
    if (walkthrough) {
      const admin = createSupabaseAdminClient();
      await admin.from('cases').update({ ideal_walkthrough: walkthrough }).eq('id', caseRow.id);
    }
  }

  const b = (session.score_breakdown ?? {}) as any;

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto">
      <a href="/cases" className="text-sm text-zinc-500 hover:text-zinc-300">← back to cases</a>
      <h1 className="text-2xl font-semibold mt-2 mb-1">{caseRow?.title ?? '—'}</h1>
      <div className="text-sm text-zinc-500 mb-6">Total score: <span className="text-zinc-100 text-lg">{session.score ?? 0}</span> / 100</div>

      <section className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-3">
          <ScoreBar label="Structure" value={b.structure ?? 0} max={40} />
          <ScoreBar label="Insight" value={b.insight ?? 0} max={40} />
          <ScoreBar label="Speed" value={b.speed ?? 0} max={20} />
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-2">Strengths</h3>
            <ul className="text-sm text-zinc-400 space-y-1">
              {(b.strengths ?? []).map((s: string, i: number) => <li key={i}>• {s}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-2">Gaps</h3>
            <ul className="text-sm text-zinc-400 space-y-1">
              {(b.gaps ?? []).map((g: string, i: number) => <li key={i}>• {g}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded border border-zinc-800 p-5 mb-8">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Ideal structure</h3>
        <IdealStructureTree s={(caseRow?.ideal_structure ?? {}) as any} />
      </section>

      {walkthrough && (
        <section className="rounded border border-zinc-800 p-5 mb-8">
          <h2 className="text-lg font-semibold text-zinc-100 mb-1">How a top candidate would solve this</h2>
          <p className="text-xs text-zinc-500 mb-5">Issue tree, hypothesis tree, and L0–L4 thinking depth — the ideal walkthrough.</p>
          <IdealWalkthroughView w={walkthrough} />
        </section>
      )}

      <SessionFeedbackForm sessionId={sessionId} />
    </main>
  );
}
