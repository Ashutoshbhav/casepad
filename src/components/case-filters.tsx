'use client';
import { useRouter, useSearchParams } from 'next/navigation';

const INDUSTRIES = ['consulting', 'fmcg', 'tech', 'healthcare', 'finance', 'infra', 'energy', 'retail', 'other'];
const TYPES = ['market_entry', 'profitability', 'mna', 'pricing', 'operations', 'gtm', 'estimation', 'other'];
const DIFFS = ['easy', 'medium', 'hard', 'expert'];

export function CaseFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.push(`/cases?${next.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <select
        defaultValue={params.get('industry') ?? ''}
        onChange={(e) => setParam('industry', e.target.value)}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm"
      >
        <option value="">All industries</option>
        {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
      </select>
      <select
        defaultValue={params.get('type') ?? ''}
        onChange={(e) => setParam('type', e.target.value)}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm"
      >
        <option value="">All types</option>
        {TYPES.map((i) => <option key={i} value={i}>{i.replace('_', ' ')}</option>)}
      </select>
      <select
        defaultValue={params.get('difficulty') ?? ''}
        onChange={(e) => setParam('difficulty', e.target.value)}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm"
      >
        <option value="">All difficulties</option>
        {DIFFS.map((i) => <option key={i} value={i}>{i}</option>)}
      </select>
      <input
        type="text"
        placeholder="Search title…"
        defaultValue={params.get('q') ?? ''}
        onChange={(e) => setParam('q', e.target.value)}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm flex-1 min-w-[200px]"
      />
    </div>
  );
}
