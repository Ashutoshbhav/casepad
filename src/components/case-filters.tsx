'use client';
import { useRouter, useSearchParams } from 'next/navigation';

const INDUSTRIES = ['consulting', 'fmcg', 'tech', 'healthcare', 'finance', 'infra', 'energy', 'retail', 'other'];
const TYPES = ['market_entry', 'profitability', 'mna', 'pricing', 'operations', 'gtm', 'estimation', 'other'];
const DIFFS = ['easy', 'medium', 'hard', 'expert'];

const QUICK_TYPES: { key: string; label: string; color: string }[] = [
  { key: '', label: 'All types', color: 'zinc' },
  { key: 'profitability', label: 'Profitability', color: 'emerald' },
  { key: 'market_entry', label: 'Market entry', color: 'sky' },
  { key: 'estimation', label: 'Guesstimates', color: 'violet' },
  { key: 'pricing', label: 'Pricing', color: 'amber' },
  { key: 'mna', label: 'M&A', color: 'rose' },
  { key: 'operations', label: 'Operations', color: 'teal' },
  { key: 'gtm', label: 'GTM', color: 'fuchsia' },
];

export function CaseFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const activeType = params.get('type') ?? '';

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.push(`/cases?${next.toString()}`);
  };

  return (
    <div className="space-y-3 mb-6">
      <div className="flex flex-wrap gap-1.5">
        {QUICK_TYPES.map((t) => (
          <button
            key={t.key || 'all'}
            onClick={() => setParam('type', t.key)}
            className={`text-xs px-3 py-1.5 rounded-full transition ${
              activeType === t.key
                ? `bg-${t.color}-700 text-white`
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <select
          defaultValue={params.get('industry') ?? ''}
          onChange={(e) => setParam('industry', e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm"
        >
          <option value="">All industries</option>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
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
    </div>
  );
}
