import Link from 'next/link';
import { TREATMENTS } from '../_lib/tokens';
import { requireAdminOrFallback } from '../_lib/admin-gate';
import { PickButton } from '../_components/pick-button';
import { HeroSection } from './_components/HeroSection';
import { CaseShowcase } from './_components/CaseShowcase';
import { ArenaPreview } from './_components/ArenaPreview';
import { DebriefPreview } from './_components/DebriefPreview';

export const metadata = {
  title: 'Design Lab v2 - Casebook Manuscript',
  robots: { index: false, follow: false },
};

export default async function CasebookManuscriptPage() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  const tokens = TREATMENTS['casebook-manuscript'];

  return (
    <>
      {/* Page-scoped Google Fonts: Newsreader, Source Serif 4, IBM Plex Mono. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Newsreader:opsz,wght@6..72,400;6..72,600;6..72,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap"
      />

      <div
        style={{
          background: tokens.bg,
          color: tokens.textPrimary,
          fontFamily: tokens.fontBody,
          minHeight: '100vh',
          ['--bg' as string]: tokens.bg,
          ['--elevated' as string]: tokens.elevated,
          ['--text-primary' as string]: tokens.textPrimary,
          ['--text-secondary' as string]: tokens.textSecondary,
          ['--accent' as string]: tokens.accent,
          ['--border' as string]: tokens.border,
        }}
      >
        <nav
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: `${tokens.bg}d9`,
            backdropFilter: 'blur(8px)',
            borderBottom: `1px solid ${tokens.border}`,
            padding: '14px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: tokens.fontMono,
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          <Link
            href="/design-lab"
            style={{ color: tokens.textSecondary, textDecoration: 'none' }}
          >
            &larr; back to lab
          </Link>
          <span style={{ color: tokens.accent }}>Casebook Manuscript</span>
        </nav>

        <HeroSection tokens={tokens} />
        <CaseShowcase tokens={tokens} />
        <ArenaPreview tokens={tokens} />
        <DebriefPreview tokens={tokens} />

        <section
          style={{
            padding: '96px 24px 128px',
            maxWidth: 720,
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: tokens.fontDisplay,
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 700,
              color: tokens.textPrimary,
              margin: '0 0 14px',
              letterSpacing: '-0.02em',
            }}
          >
            Bound. Stamped. Yours.
          </h2>
          <p
            style={{
              fontFamily: tokens.fontBody,
              fontStyle: 'italic',
              fontSize: '17px',
              lineHeight: 1.55,
              color: tokens.textSecondary,
              margin: '0 0 32px',
            }}
          >
            A casebook for the kind of student who actually argues from it.
          </p>
          <PickButton tokens={tokens} />
        </section>
      </div>
    </>
  );
}
