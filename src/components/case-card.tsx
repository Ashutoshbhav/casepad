import Link from 'next/link';
import type { CaseRow } from '@/lib/types/domain';

export function CaseCard({ c }: { c: CaseRow }) {
  return (
    <Link
      href={`/solve/${c.id}`}
      className="block rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase text-zinc-500">{c.case_type.replace('_', ' ')}</span>
        <span className={`text-xs px-2 py-0.5 rounded ${diffStyle(c.difficulty)}`}>{c.difficulty}</span>
      </div>
      <h3 className="font-medium text-zinc-100 mb-1 line-clamp-2">{c.title}</h3>
      <div className="text-xs text-zinc-500">{c.source ?? 'unknown'} · {c.industry}</div>
    </Link>
  );
}

function diffStyle(d: string) {
  switch (d) {
    case 'easy': return 'bg-emerald-900/40 text-emerald-300';
    case 'medium': return 'bg-amber-900/40 text-amber-300';
    case 'hard': return 'bg-rose-900/40 text-rose-300';
    case 'expert': return 'bg-fuchsia-900/40 text-fuchsia-300';
    default: return 'bg-zinc-800 text-zinc-300';
  }
}
