// /design-lab/v2 — hub for the HUPR-flavor v2 system.
//
// Five surfaces under one roof. Each is admin-gated and lives in its
// own subroute. Production untouched until Ash green-lights promotion.

import { IBM_Plex_Mono, Montserrat } from 'next/font/google';
import { requireAdminOrFallback } from '../_lib/admin-gate';
import { Masthead, SectionEyebrow, Marquee } from './_components/masthead';
import Link from 'next/link';

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-v2-mono',
  weight: ['400', '500'],
});
const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-v2-display',
  weight: ['400', '500', '700', '800'],
});

export const metadata = {
  title: 'Design Lab v2 — Hub',
  robots: { index: false },
};

const SURFACES = [
  { href: '/design-lab/v2/signin',    nº: '01', label: 'Signin',    note: 'Photo + Rough.js tree · 5 frameworks · 3-shot carousel' },
  { href: '/design-lab/v2/dashboard', nº: '02', label: 'Dashboard', note: 'Type-mode hero · streak calendar · recent reps grid' },
  { href: '/design-lab/v2/cases',     nº: '03', label: 'Cases',     note: 'Library w/ 3 track-color bands (beige/burgundy/slate)' },
  { href: '/design-lab/v2/solve',     nº: '04', label: 'Solve',     note: 'Transcript-as-document · sticky issue-tree right rail' },
  { href: '/design-lab/v2/debrief',   nº: '05', label: 'Debrief',   note: 'Massive score reveal · 3-up sub-scores · walkthrough' },
];

export default async function V2HubPage() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  return (
    <main
      className={`v2-hub-scope ${plexMono.variable} ${montserrat.variable}`}
      style={{
        minHeight: '100vh',
        background: '#F5F0E8',
        color: 'rgb(50,50,52)',
        fontFamily: 'var(--font-v2-mono)',
      }}
    >
      <Masthead caption={['Design Lab', 'Volume II ·', 'HUPR-flavor system']} />
      <SectionEyebrow label="System v2 · 5 surfaces · production untouched" meta="cohort one · MMXXVI" />

      <section style={{ padding: '120px 36px 60px', maxWidth: 1400, margin: '0 auto' }}>
        <h1
          style={{
            fontFamily: 'var(--font-v2-display)',
            fontWeight: 700,
            fontSize: 'clamp(64px, 10vw, 156px)',
            lineHeight: 0.92,
            letterSpacing: '-0.025em',
            color: 'rgb(50,50,52)',
            margin: 0,
            maxWidth: '12ch',
          }}
        >
          THE V2 SYSTEM.
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-v2-mono)',
            fontSize: 14,
            lineHeight: 1.65,
            color: 'rgba(50,50,52,0.7)',
            maxWidth: '52ch',
            marginTop: 32,
            letterSpacing: '0.005em',
          }}
        >
          Cloned from hupr.ca via Playwright computed-style inspection.
          Two fonts (IBM Plex Mono + Montserrat 700). Two modes (photo
          for signin, type-mode for everything else). Single accent —
          black on cream. Five surfaces below.
        </p>
      </section>

      {/* SURFACES INDEX */}
      <section style={{ padding: '60px 36px 120px', maxWidth: 1400, margin: '0 auto' }}>
        {SURFACES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 28,
              padding: '28px 0',
              borderTop: '1px solid rgba(0,0,0,0.18)',
              textDecoration: 'none',
              color: 'rgb(50,50,52)',
              transition: 'transform 250ms cubic-bezier(0.12, 0, 0.08, 1)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-v2-mono)',
                fontSize: 11,
                letterSpacing: '0.22em',
                color: 'rgba(50,50,52,0.5)',
                minWidth: 36,
              }}
            >
              {s.nº}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-v2-display)',
                fontWeight: 700,
                fontSize: 'clamp(40px, 7vw, 96px)',
                lineHeight: 1,
                letterSpacing: '-0.025em',
                flex: '0 0 auto',
              }}
            >
              {s.label}.
            </span>
            <span
              style={{
                fontFamily: 'var(--font-v2-mono)',
                fontSize: 12,
                letterSpacing: '0.04em',
                color: 'rgba(50,50,52,0.7)',
                marginLeft: 'auto',
                paddingTop: 18,
                maxWidth: '40ch',
                textAlign: 'right',
              }}
            >
              {s.note}
            </span>
            <span
              aria-hidden="true"
              style={{
                fontFamily: 'var(--font-v2-mono)',
                fontSize: 18,
                color: 'rgb(50,50,52)',
                paddingTop: 24,
              }}
            >
              →
            </span>
          </Link>
        ))}
      </section>

      <Marquee text="PRACTICE THE ROOM" variant="dark" />

      <a
        href="/design-lab"
        style={{
          position: 'fixed',
          bottom: 16,
          left: 24,
          fontFamily: 'var(--font-v2-mono)',
          fontSize: 10,
          color: 'rgba(50,50,52,0.5)',
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          zIndex: 50,
        }}
      >
        ← Design Lab v1
      </a>
    </main>
  );
}
