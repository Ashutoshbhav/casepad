import Link from 'next/link';
import { requireUser } from '@/lib/supabase/require-user';
import { TUTORIAL_MENU } from '@/lib/starter-cases';

// Tutorial menu — first-time users land here when clicking "Take me through
// a case" on /cases. They pick from 4 easy/medium starters spanning case
// types. Each link bounces to /solve/<id>?tutorial=1 which fires the 6-step
// solve overlay tour. Better than dropping users into ONE pre-picked case
// (InvestCo) without context.

export default async function TutorialPage() {
  await requireUser();

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <Link href="/cases" className="text-sm text-zinc-500 hover:text-zinc-300">← back to cases</Link>
        <h1 className="text-2xl sm:text-3xl font-semibold mt-3 mb-2">🎓 Pick a starter case</h1>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
          We&apos;ll walk you through your first case with overlay tooltips on the solve page (6 steps,
          ~30 sec). Pick one that matches what you want to practice. All four are easy or medium difficulty.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TUTORIAL_MENU.map((c) => (
          <Link
            key={c.id}
            href={`/solve/${c.id}?tutorial=1`}
            className="block rounded-xl border border-zinc-800 bg-zinc-900 hover:border-violet-700 hover:bg-violet-950/20 transition p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{c.emoji}</span>
              <div className="flex gap-1.5 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase">{c.case_type.replace('_', ' ')}</span>
                <span className={`px-2 py-0.5 rounded uppercase ${c.difficulty === 'easy' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-amber-900/40 text-amber-300'}`}>
                  {c.difficulty}
                </span>
              </div>
            </div>
            <h3 className="text-base font-semibold text-zinc-100 mb-1.5">{c.title}</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">{c.one_liner}</p>
            <div className="mt-4 text-xs text-violet-300 group-hover:text-violet-200">
              Start tutorial →
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 text-xs text-zinc-500">
        Want to skip the tutorial and pick from the full library? <Link href="/cases" className="text-zinc-300 underline hover:text-zinc-100">Browse all 1,165 cases →</Link>
      </div>
    </main>
  );
}
