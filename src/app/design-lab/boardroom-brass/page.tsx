import Link from 'next/link';
import { TREATMENTS } from '../_lib/tokens';
import { requireAdminOrFallback } from '../_lib/admin-gate';
import { PickButton } from '../_components/pick-button';
import { HeroSection } from './_components/HeroSection';
import { CaseShowcase } from './_components/CaseShowcase';
import { ArenaPreview } from './_components/ArenaPreview';
import { DebriefPreview } from './_components/DebriefPreview';

export const metadata = {
  title: 'Design Lab v2 - Boardroom Brass',
  robots: { index: false, follow: false },
};

export default async function BoardroomBrassPage() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  const tokens = TREATMENTS['boardroom-brass'];

  return (
    <>
      {/* Page-scoped Google Fonts: Fraunces, Inter Tight, JetBrains Mono. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
      />

      <div
        style={{
          background: tokens.bg,
          color: tokens.textPrimary,
          fontFamily: tokens.fontBody,
          minHeight: '100vh',
          // Scoped tokens as CSS custom properties so anything inside can read.
          ['--bg' as string]: tokens.bg,
          ['--elevated' as string]: tokens.elevated,
          ['--text-primary' as string]: tokens.textPrimary,
          ['--text-secondary' as string]: tokens.textSecondary,
          ['--accent' as string]: tokens.accent,
          ['--border' as string]: tokens.border,
        }}
      >
        {/* Top nav strip */}
        <nav
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: `${tokens.bg}cc`,
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
          <span style={{ color: tokens.accent }}>Boardroom Brass</span>
        </nav>

        <HeroSection tokens={tokens} />
        <CaseShowcase tokens={tokens} />
        <ArenaPreview tokens={tokens} />
        <DebriefPreview tokens={tokens} />

        {/* CTA */}
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
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: tokens.textPrimary,
              margin: '0 0 14px',
            }}
          >
            This is the room.
          </h2>
          <p
            style={{
              fontFamily: tokens.fontBody,
              fontSize: '17px',
              lineHeight: 1.55,
              color: tokens.textSecondary,
              margin: '0 0 32px',
            }}
          >
            Editorial gravitas. Brass-rule discipline. The cabin at 9pm.
          </p>
          <PickButton tokens={tokens} />
        </section>
      </div>
    </>
  );
}
