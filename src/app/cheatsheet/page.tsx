import { requireUser } from '@/lib/supabase/require-user';
import { withRetry } from '@/lib/supabase/with-retry';
import { TRACKS, type Track } from '@/lib/tracks';
import { CheatsheetTabs } from '@/components/cheatsheet-tabs';
import { HuprObserveReveals } from '@/components/hupr/hupr-observe-reveals';

export const dynamic = 'force-dynamic';

export default async function CheatsheetPage() {
  const { supabase, user } = await requireUser();

  const track: Track = (user.user_metadata?.preferred_track as Track) || 'consulting';

  // Pull last 10 completed sessions for the weakness-indexed view.
  // withRetry never throws, so a DB blip degrades to an empty list (handled
  // by `sessions || []` below) instead of crashing the whole cheat sheet.
  const { data: sessions } = await withRetry(() =>
    supabase
      .from('sessions')
      .select('score_breakdown, ended_at, track')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('ended_at', { ascending: false })
      .limit(10)
  );

  const def = TRACKS[track];

  // Compute weakest dim
  const totals: Record<string, { sum: number; count: number; weight: number }> = {};
  const dimByName: Record<string, { weight: number }> = {};
  for (const r of def.rubric) {
    dimByName[r.dimension.toLowerCase().replace(/\s+/g, '_')] = { weight: r.weight };
  }
  for (const s of sessions || []) {
    const b = (s.score_breakdown ?? {}) as any;
    for (const [k, v] of Object.entries(b)) {
      if (typeof v !== 'number' || k === 'total') continue;
      if (!totals[k]) totals[k] = { sum: 0, count: 0, weight: dimByName[k]?.weight || 100 };
      totals[k].sum += v;
      totals[k].count++;
    }
  }
  const dimRatios = Object.entries(totals).map(([k, t]) => ({
    dim: k,
    avg: t.count ? t.sum / t.count : 0,
    weight: t.weight,
    ratio: t.count ? t.sum / t.count / t.weight : 1,
  })).sort((a, b) => a.ratio - b.ratio);

  return (
    <main
      className="min-h-screen px-6 sm:px-12 py-12 max-w-6xl mx-auto"
      style={{ background: 'var(--color-bg-canvas)', color: 'var(--color-text-primary)' }}
    >
      <HuprObserveReveals />

      {/* Header band */}
      <header className="mb-12">
        <span className="hupr-mono-eyebrow">Cheat sheet</span>
        <hr className="hupr-hairline" />
        <div className="mt-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <h1
              className="uppercase"
              style={{
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: 'clamp(40px, 6vw, 72px)',
                lineHeight: 1,
                color: 'var(--color-text-primary)',
                margin: 0,
                maxWidth: '20ch',
              }}
            >
              {def.label}
            </h1>
            <div
              className="mt-3"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-secondary)',
              }}
            >
              {sessions?.length || 0} cases solved
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-5">
            {[
              { href: '/company-pack', label: 'Company pack' },
              { href: '/drill', label: 'Recovery' },
              { href: '/math-drill', label: 'Math' },
              { href: '/behavioral-drill', label: 'Behavioral' },
              { href: '/cases', label: '← Cases' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="hupr-mono-eyebrow underline"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <CheatsheetTabs
        track={track}
        weakestDims={dimRatios.slice(0, 3).map((r) => r.dim)}
        weakestStats={dimRatios.slice(0, 5)}
      />
    </main>
  );
}
