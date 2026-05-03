import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Drills index — three short-form practice modes outside the case arena.
// Linked from the top nav so users find them without hunting through urls.

export default async function DrillsIndexPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/signin');

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2">🎯 Drills</h1>
        <p className="text-sm text-zinc-400">
          Short-form practice modes. Pick what you want to sharpen — each is 5-15 min.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DrillCard
          href="/math-drill"
          icon="🔢"
          title="Math drill"
          desc="Mental math under interview pressure. L1-L4 difficulty. 100-question pool. Auto-tracks your accuracy."
        />
        <DrillCard
          href="/behavioral-drill"
          icon="🎤"
          title="Behavioral drill"
          desc="30 STAR-style questions. Type your response, get LLM-rubric feedback (6 dimensions) + ideal-answer reference."
        />
        <DrillCard
          href="/drill"
          icon="🌀"
          title="Recovery drill"
          desc="Curveballs interviewers throw — silent stretch, contradictory data, abrupt redirect. Practice not freezing."
        />
      </div>
    </main>
  );
}

function DrillCard({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-zinc-800 bg-zinc-900 hover:border-emerald-700 hover:bg-emerald-950/10 transition p-5"
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-zinc-100 mb-1.5">{title}</h3>
      <p className="text-xs text-zinc-400 leading-relaxed">{desc}</p>
      <div className="mt-3 text-xs text-emerald-300">Start →</div>
    </Link>
  );
}
