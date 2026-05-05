import Link from 'next/link';
import { TREATMENTS, type TreatmentId } from './_lib/tokens';
import { CurrentPickBadge } from './_components/current-pick-badge';
import { requireAdminOrFallback } from './_lib/admin-gate';

// Design Lab v2 — hub. Each treatment lives at its own full-page route. This
// hub just lists 3 link cards, each preview-styled in its direction's tokens.

export const metadata = {
  title: 'Design Lab v2',
  robots: { index: false, follow: false },
};

const HUB_ORDER: TreatmentId[] = [
  'boardroom-brass',
  'liquid-tutor',
  'casebook-manuscript',
];

export default async function DesignLabHubPage() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-10 py-10 max-w-6xl mx-auto">
      <header className="mb-8">
        <Link
          href="/admin"
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          &larr; back to admin
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold mt-3 mb-1 text-zinc-100">
          Design Lab v2 &mdash; Three Full Treatments
        </h1>
        <p className="text-sm text-zinc-400 max-w-3xl">
          Each link below is a full-page experience. Scroll through, then pick
          the winner. Treatments are showroom only &mdash; nothing site-wide
          changes today.
        </p>
        <div className="mt-3">
          <CurrentPickBadge />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {HUB_ORDER.map((id) => {
          const t = TREATMENTS[id];
          return (
            <Link
              key={t.id}
              href={`/design-lab/${t.id}`}
              className="group block rounded-lg overflow-hidden ring-1 ring-zinc-800 hover:ring-amber-700 transition"
              style={{ background: t.bg, color: t.textPrimary }}
            >
              <div
                style={{
                  padding: '32px 24px 28px',
                  borderBottom: `1px solid ${t.border}`,
                }}
              >
                <div
                  style={{
                    fontFamily: t.fontMono,
                    fontSize: '11px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: t.textSecondary,
                    marginBottom: 14,
                  }}
                >
                  Treatment {HUB_ORDER.indexOf(id) + 1} / 3
                </div>
                <div
                  style={{
                    fontFamily: t.fontDisplay,
                    fontSize: '36px',
                    lineHeight: 1.05,
                    fontWeight: id === 'casebook-manuscript' ? 700 : 600,
                    fontStyle: id === 'liquid-tutor' ? 'italic' : 'normal',
                    color: t.textPrimary,
                    marginBottom: 12,
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    width: 36,
                    height: 1,
                    background: t.accent,
                    marginBottom: 12,
                  }}
                />
                <p
                  style={{
                    fontFamily: t.fontBody,
                    fontSize: '14px',
                    lineHeight: 1.55,
                    color: t.textSecondary,
                    margin: 0,
                  }}
                >
                  {t.vibe}
                </p>
              </div>
              <div
                style={{
                  padding: '14px 24px 20px',
                  fontFamily: t.fontBody,
                  fontSize: '13px',
                  color: t.accent,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>View full treatment</span>
                <span className="group-hover:translate-x-1 transition">
                  &rarr;
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <footer className="mt-10 text-xs text-zinc-600 max-w-3xl">
        Each treatment renders outside the global &ldquo;War Room&rdquo; theme
        with its own scoped tokens and Google Fonts so motion + identity moments
        come through cleanly. Picking a winner here writes to localStorage only;
        site-wide rollout is a separate pass.
      </footer>
    </main>
  );
}
