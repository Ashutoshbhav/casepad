import { directSignIn } from '@/server-actions/direct-signin';
import { HeroTicker } from '@/components/hero-ticker';

// Cohort access — pure email-only sign-in. Server action mints a session
// immediately if the email is on the allowlist; otherwise redirects with
// ?error= so the form re-renders with a message.
//
// Visual (rebuilt 2026-05-06 — HUPR makeover):
//   The page is one editorial landing — full-bleed photo header with a
//   marquee tagline crossing it, a floating white sign-in panel on the
//   right, hairline-divided info sections below. No WebGL, no 3D type,
//   no editorial italic — pure HUPR design language.

const ERROR_MESSAGES: Record<string, string> = {
  'missing-email': 'Please enter your email.',
  'invalid-email': 'That doesn’t look like a valid email.',
  'link-mint-failed': 'Couldn’t prepare your sign-in. Try again in a moment.',
  'verify-failed': 'Sign-in failed. Try again — if this keeps happening, ping the admin.',
  'expired': 'Your session expired. Sign in again to pick up where you left off.',
  'exchange': 'Sign-in link is invalid or expired. Try entering your email again.',
  'otp': 'Sign-in code is invalid or expired. Try entering your email again.',
  'rate-limited': 'Too many sign-in attempts. Please wait a minute and try again.',
};

const HERO_PHOTO =
  'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=2400&q=80';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; return_to?: string }>;
}) {
  const sp = await searchParams;
  const errMsg = sp.error ? ERROR_MESSAGES[sp.error] : null;
  const returnTo = sp.return_to;
  const showSessionExpired = sp.error === 'expired' || !!sp.return_to;

  return (
    <main
      data-signin-page="true"
      className="relative w-full overflow-x-hidden"
      style={{
        background: 'var(--color-bg-canvas)',
        color: 'var(--color-text-primary)',
        minHeight: '100vh',
      }}
    >
      {/* ── HERO ───────────────────────────────────────────────────────
          Full-bleed photo + scrolling marquee headline + floating white
          sign-in panel on the right. */}
      <section
        className="relative w-full overflow-hidden"
        style={{ height: '100vh', minHeight: 760 }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${HERO_PHOTO})`,
            backgroundSize: 'cover',
            backgroundPosition: '50% 50%',
            filter: 'brightness(0.78) saturate(0.92)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(50,50,52,0.35) 0%, rgba(50,50,52,0.10) 35%, rgba(50,50,52,0.0) 65%, rgba(50,50,52,0.55) 100%)',
          }}
        />

        {/* Header band */}
        <header
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 sm:px-12 py-6"
        >
          <span
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: 24,
              color: '#FFFFFF',
              letterSpacing: '-0.005em',
            }}
          >
            CasePad
          </span>
          <span
            className="hidden sm:inline-block"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: '#FFFFFF',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              opacity: 0.85,
            }}
          >
            Cohort · May 2026
          </span>
        </header>

        {/* Auto-scrolling marquee headline */}
        <div
          className="absolute z-10 whitespace-nowrap overflow-hidden"
          style={{ top: 'calc(64vh - 8vw)', left: 0, right: 0 }}
        >
          <div className="hupr-marquee items-center">
            {[0, 1, 2].map((k) => (
              <div
                key={k}
                className="flex items-center"
                style={{ marginRight: '4vw' }}
              >
                <h1
                  className="flex items-center"
                  style={{
                    fontFamily: 'var(--font-headline)',
                    fontWeight: 700,
                    fontSize: '13vw',
                    lineHeight: 1,
                    textTransform: 'uppercase',
                    color: '#FFFFFF',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.01em',
                    gap: '3vw',
                  }}
                >
                  The Room Before The Room
                </h1>
              </div>
            ))}
          </div>
        </div>

        {/* Floating sign-in panel */}
        <div
          className="absolute px-6 sm:px-0"
          style={{
            top: '50%',
            right: '2rem',
            width: 'min(420px, 92vw)',
            transform: 'translateY(-50%)',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              padding: '2rem',
              borderRadius: 4,
              color: '#323234',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 400,
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: '#323234',
                margin: 0,
              }}
            >
              Sign in
            </h2>
            <hr
              style={{
                border: 0,
                borderTop: '1px solid #323234',
                margin: '8px 0 24px',
                width: '100%',
              }}
            />
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                lineHeight: 1.55,
                color: '#323234',
                margin: 0,
              }}
            >
              Cohort access — enter the email on the allowlist and we’ll
              sign you in immediately. No magic link. No password.
            </p>

            {showSessionExpired && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  border: '1px solid #323234',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#323234',
                  borderRadius: 3,
                }}
              >
                Your session expired. Sign in again to continue.
              </div>
            )}

            <form action={directSignIn} className="mt-6 space-y-3">
              <input
                name="email"
                type="email"
                placeholder="you@school.edu"
                required
                autoFocus
                className="w-full"
                style={{
                  background: '#f4f4f4',
                  border: '1px solid #e8e8e8',
                  padding: '12px 14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: '#323234',
                  borderRadius: 3,
                  outline: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                }}
              />
              {returnTo && (
                <input type="hidden" name="return_to" value={returnTo} />
              )}
              <button
                type="submit"
                className="hupr-anim-btn w-full"
                style={{
                  background: '#323234',
                  color: '#FFFFFF',
                  padding: '12px 16px',
                  borderRadius: 6,
                  border: 0,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                <span className="top">Sign in</span>
                <span className="btm">Sign in</span>
              </button>
              {errMsg && (
                <div
                  style={{
                    padding: 10,
                    border: '1px solid #b33c3c',
                    color: '#b33c3c',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    borderRadius: 3,
                  }}
                >
                  {errMsg}
                </div>
              )}
            </form>

            <div
              style={{
                marginTop: 20,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                lineHeight: 1.6,
                color: 'rgba(50,50,52,0.65)',
              }}
            >
              Not on the allowlist? Ask the admin (your cohort lead) to add
              your email at{' '}
              <span style={{ color: '#323234' }}>/admin/allowlist</span>.
            </div>

            <div
              style={{
                marginTop: 12,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                lineHeight: 1.6,
                color: 'rgba(50,50,52,0.55)',
              }}
            >
              By signing in, you agree to the{' '}
              <a
                href="/terms"
                style={{
                  color: '#323234',
                  textDecoration: 'underline',
                }}
              >
                Terms of Use
              </a>{' '}
              — allowlist-only, no copying, no scraping, personal use.
            </div>
          </div>
        </div>
      </section>

      {/* ── LIBRARY TICKER ─────────────────────────────────────────────
          Real case titles scroll through to demonstrate library density. */}
      <section
        style={{
          background: 'var(--color-bg-canvas)',
          padding: '40px 0',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="px-6 sm:px-12 mb-6">
          <span className="hupr-mono-eyebrow">From the library</span>
          <hr className="hupr-hairline" />
        </div>
        <HeroTicker />
      </section>

      {/* ── ABOUT ──────────────────────────────────────────────────────
          Eyebrow + Montserrat 700 billboard explaining what CasePad is. */}
      <section
        className="px-6 sm:px-12 py-16 sm:py-24"
        style={{
          background: 'var(--color-bg-canvas)',
        }}
      >
        <div className="lg:flex gap-16">
          <div className="w-full lg:w-4/12">
            <span className="hupr-mono-eyebrow">About CasePad</span>
            <hr className="hupr-hairline" />
          </div>
          <div className="w-full lg:w-8/12 mt-6 lg:mt-0">
            <h1
              className="hupr-h1 uppercase"
              style={{ margin: 0 }}
            >
              When Cases Build Conviction
            </h1>
            <p
              className="hupr-fade-up"
              style={{
                fontFamily: 'var(--font-accent)',
                fontSize: 17,
                lineHeight: 1.55,
                color: 'var(--color-text-primary)',
                marginTop: 32,
                maxWidth: '60ch',
              }}
            >
              Live case interview practice with Ash — your AI engagement
              manager. Trained on 1,165 real cases across consulting, IB, PM,
              marketing, and strategy tracks. Not a casebook. Not a chatbot.
              A rehearsal room.
            </p>
            <p
              className="hupr-fade-up"
              style={{
                fontFamily: 'var(--font-accent)',
                fontSize: 17,
                lineHeight: 1.55,
                color: 'var(--color-text-primary)',
                marginTop: 16,
                maxWidth: '60ch',
              }}
            >
              Show up daily. Solve a case. Drill the gap. Debrief in the open.
              The cohort sees the lessons that helped them. The lesson lands
              before the next case starts.
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────
          Three steps as hairline-divided rows — HUPR's news pattern. */}
      <section
        className="px-6 sm:px-12 py-16 sm:py-24"
        style={{
          background: 'var(--color-bg-sunken)',
        }}
      >
        <span className="hupr-mono-eyebrow">How it works</span>
        <hr className="hupr-hairline" />
        {[
          {
            n: '01',
            t: 'Solve',
            b: 'Pick a track. Pick a case from a real school. Hit start. Ash holds the room — pushes when you stall, calls when the math drifts, asks the follow-ups that come up in the actual interview.',
          },
          {
            n: '02',
            t: 'Drill',
            b: 'Your scoring breakdown surfaces the muscle that gave way — math speed, framework branches, behavioural STAR. Reps are short, sharp, scored. The drill pool grows from your own gaps.',
          },
          {
            n: '03',
            t: 'Debrief',
            b: 'Every rep ends with a written take. Score, rubric breakdown, ideal structure tree, two specific lessons. Published privately to your debrief feed. Cohort sees the lessons that helped them.',
          },
        ].map((s) => (
          <div
            key={s.n}
            className="lg:flex gap-12 py-10"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="w-full lg:w-3/12">
              <span
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontWeight: 700,
                  fontSize: 'clamp(48px, 6vw, 96px)',
                  lineHeight: 1,
                  color: 'var(--color-text-primary)',
                }}
              >
                {s.n}
              </span>
            </div>
            <div className="w-full lg:w-3/12 mt-4 lg:mt-0">
              <h2
                className="uppercase"
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontWeight: 700,
                  fontSize: 'clamp(28px, 3vw, 48px)',
                  lineHeight: 1,
                  color: 'var(--color-text-primary)',
                  margin: 0,
                }}
              >
                {s.t}
              </h2>
            </div>
            <div className="w-full lg:w-6/12 mt-4 lg:mt-0">
              <p
                className="hupr-fade-up"
                style={{
                  fontFamily: 'var(--font-accent)',
                  fontSize: 16,
                  lineHeight: 1.55,
                  color: 'var(--color-text-primary)',
                  margin: 0,
                }}
              >
                {s.b}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <footer
        className="px-6 sm:px-12 py-12"
        style={{
          background: 'var(--color-bg-canvas)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <div className="lg:flex justify-between items-center">
          <div
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: 24,
              color: 'var(--color-text-primary)',
            }}
          >
            CasePad
          </div>
          <div
            className="mt-4 lg:mt-0"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            © 2026 CasePad — cohort case-prep
          </div>
        </div>
      </footer>
    </main>
  );
}
