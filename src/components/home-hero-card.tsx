// Home-page hero card — slots into HuprDesign.heroRightCard. Marketing CTA
// to /auth/signin. Mirrors the SignInCard layout (eyebrow + hairline +
// Montserrat 700 uppercase title + body + dark-fill CTA + secondary anchor)
// but without the auth form.

import Link from 'next/link';

export function HomeHeroCard() {
  return (
    <div
      style={{
        background: '#FFFFFF',
        padding: '2rem',
        borderRadius: 4,
      }}
    >
      <span
        className="hupr-mono-eyebrow"
        style={{ color: '#323234' }}
      >
        Cohort case prep · 2026
      </span>
      <hr
        style={{
          border: 0,
          borderTop: '1px solid #323234',
          margin: '8px 0 20px',
        }}
      />
      <h1
        className="uppercase"
        style={{
          fontFamily: 'var(--font-headline)',
          fontWeight: 700,
          fontSize: 32,
          lineHeight: 1.05,
          letterSpacing: '-0.005em',
          color: '#323234',
          margin: 0,
        }}
      >
        The room before the room.
      </h1>
      <p
        className="mt-4"
        style={{
          fontFamily: 'var(--font-accent)',
          fontSize: 15,
          lineHeight: 1.55,
          color: '#323234',
          margin: 0,
        }}
      >
        1,165 real cases. An AI engagement manager who stays on script. A cohort
        of 12 schools rehearsing together. Six weeks of reps before your first
        real interview.
      </p>
      <div className="mt-7 flex flex-wrap items-center gap-4">
        <Link
          href="/auth/signin"
          className="hupr-anim-btn"
          style={{
            display: 'inline-block',
            background: '#323234',
            color: '#FFFFFF',
            padding: '14px 22px',
            borderRadius: 6,
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            textDecoration: 'none',
          }}
        >
          Sign in to begin
        </Link>
        <Link
          href="#tracks"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'rgba(50,50,52,0.65)',
            textDecoration: 'underline',
          }}
        >
          See what we do →
        </Link>
      </div>
    </div>
  );
}
