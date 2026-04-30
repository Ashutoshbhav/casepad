import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ScoreBar } from '@/components/score-bar';
import { IdealStructureTree } from '@/components/ideal-structure-tree';

export default async function DebriefPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: session } = await supabase
    .from('sessions').select('*').eq('id', sessionId).single();
  if (!session) redirect('/cases');
  const { data: caseRow } = await supabase
    .from('cases').select('title, ideal_structure').eq('id', session.case_id).single();

  const b = (session.score_breakdown ?? {}) as any;

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
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

      <section className="rounded border border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Ideal structure</h3>
        <IdealStructureTree s={(caseRow?.ideal_structure ?? {}) as any} />
      </section>
    </main>
  );
}
