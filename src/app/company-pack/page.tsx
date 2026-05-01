'use client';

import { useState } from 'react';

export const dynamic = 'force-dynamic';

interface Pack {
  firm: string;
  interview_archetypes?: { name: string; frequency: string; what_to_expect: string }[];
  behavioral_focus?: string[];
  case_types_to_drill?: string[];
  math_to_warm_up?: string[];
  spike_phrases_for_this_firm?: string[];
  tonight_checklist?: string[];
  morning_checklist?: string[];
}

export default function CompanyPackPage() {
  const [firm, setFirm] = useState('');
  const [location, setLocation] = useState('');
  const [round, setRound] = useState('');
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!firm.trim()) return;
    setLoading(true);
    try {
      const r = await fetch('/api/company-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firm, location, round }),
      });
      const data = await r.json();
      setPack(data.pack);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Company-specific pre-interview pack</h1>
        <a href="/cheatsheet" className="text-sm text-zinc-400 hover:text-zinc-200">← cheat sheet</a>
      </header>
      <p className="text-sm text-zinc-400 mb-6">Generate a 24-hour-before crammer for your specific interview. We pull recent interview reports + tailor to your track.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <input value={firm} onChange={(e) => setFirm(e.target.value)} placeholder="Firm (e.g. Bain)" className="rounded bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. Bangalore)" className="rounded bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm" />
        <input value={round} onChange={(e) => setRound(e.target.value)} placeholder="Round (e.g. R2 next Tue)" className="rounded bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm" />
      </div>
      <button onClick={generate} disabled={loading || !firm.trim()} className="rounded bg-white text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50">
        {loading ? 'Researching…' : 'Generate pack'}
      </button>

      {pack && (
        <div className="mt-8 space-y-5">
          <Section title="Interview archetypes (most common first)">
            <ul className="space-y-2">
              {(pack.interview_archetypes || []).map((a, i) => (
                <li key={i} className="rounded border border-zinc-800 p-3 text-sm">
                  <div className="flex items-baseline justify-between">
                    <span className="text-emerald-300 font-medium">{a.name}</span>
                    <span className="text-xs text-zinc-500">{a.frequency}</span>
                  </div>
                  <div className="text-zinc-400 text-xs mt-1">{a.what_to_expect}</div>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Behavioral focus">
            <ListBlock items={pack.behavioral_focus || []} />
          </Section>
          <Section title="Case types to drill">
            <ListBlock items={pack.case_types_to_drill || []} />
          </Section>
          <Section title="Math to warm up tonight">
            <ListBlock items={pack.math_to_warm_up || []} />
          </Section>
          <Section title="Spike phrases that land at this firm">
            <ListBlock items={pack.spike_phrases_for_this_firm || []} italic />
          </Section>
          <Section title="Tonight checklist">
            <ListBlock items={pack.tonight_checklist || []} bullet="□" />
          </Section>
          <Section title="Morning checklist">
            <ListBlock items={pack.morning_checklist || []} bullet="□" />
          </Section>
        </div>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-zinc-300 mb-2">{title}</h3>
      {children}
    </section>
  );
}

function ListBlock({ items, italic, bullet }: { items: string[]; italic?: boolean; bullet?: string }) {
  if (!items.length) return <div className="text-xs text-zinc-500">—</div>;
  return (
    <ul className={`text-sm space-y-1 ${italic ? 'italic text-violet-200' : 'text-zinc-300'}`}>
      {items.map((it, i) => <li key={i}>{bullet || '·'} {it}</li>)}
    </ul>
  );
}
