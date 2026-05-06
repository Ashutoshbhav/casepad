import { directSignIn } from '@/server-actions/direct-signin';
import {
  SignInSceneRegister,
  SignInScrollProgressMount,
  SignInEditorialReveal2,
  SignInEditorialReveal3,
  SignInHeroTagline,
} from '@/components/signin-hero';
import {
  SceneStateDividers,
  WhatIsCasePadSection,
  CasesPreviewSection,
  HowItWorksSection,
  FounderNoteSection,
  FaqSection,
  SignInFooter,
} from '@/components/signin-landing-sections';
import { HeroTicker } from '@/components/hero-ticker';

// Cohort access — pure email-only sign-in. If the email is on the allowlist,
// the server action mints a session immediately and redirects to /cases.
// No inbox round-trip, no magic link, no password.
//
// Trade-off (explicit): anyone who knows an allowlisted email can sign in
// as that person. Acceptable for a private 5-30 cohort with low-stakes
// content (case-solve transcripts only).
//
// Visual (revised 2026-05-04 — landing pass):
//   The form is at the TOP of the page, visible from scroll=0. Users who
//   came to sign in see it immediately — type email, click button, done.
//
//   Below the form, a content-rich landing flow tells the story of the
//   product across ~9 viewports. Three editorial reveal lines (Lusion-grade
//   one-way SplitText) interleave with six content sections:
//
//     1. Hero form (top viewport)
//     2. Reveal: "the room before the room."
//     3. What is CasePad — editorial paragraph + sample chat snippet
//     4. Reveal: "rehearse like it's real."
//     5. From the library — 3 real-case preview cards
//     6. Reveal: "ASH listens."
//     7. How it works — 3-step walkthrough
//     8. Founder note
//     9. FAQ — semantic <details> accordion
//    10. Footer — compact grounding strip
//
//   The persistent layout-level WebGL asterisk does its scroll-driven
//   choreography in the background. As scrollProgress crosses section
//   boundaries, <SceneStateDividers /> briefly pulses aiState so the
//   asterisk reacts (thinking → listening → thinking → celebrating).

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

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; return_to?: string }> }) {
  const sp = await searchParams;
  const errMsg = sp.error ? ERROR_MESSAGES[sp.error] : null;
  const returnTo = sp.return_to;
  const showSessionExpired = sp.error === 'expired' || !!sp.return_to;

  return (
    <main
      // ~900vh tall — first viewport hosts the form, the next 8 viewports
      // are the editorial reveals + content sections, and a compact footer
      // closes things out. overflow-x hidden because the WebGL canvas is
      // full-bleed fixed; vertical scroll is the intended axis.
      // Black space — body gets `data-route="signin"` so globals.css can
      // paint the body black on this route only. Main itself is transparent
      // so the persistent WebGL canvas (z-index 0, fixed) shows through.
      className="relative w-full overflow-x-hidden"
      data-signin-page="true"
      style={{
        background: 'transparent',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* Tiny client islands — register the 'signin' preset, mount the
          scroll-progress observer once, and watch for section-boundary
          aiState bursts. All render nothing. */}
      <SignInSceneRegister />
      <SignInScrollProgressMount />
      <SceneStateDividers />

      {/* Top viewport — header bar + sign-in form panel.
          min-h-screen so this block alone fills the first viewport; the
          form is reachable WITHOUT scrolling. The persistent WebGL canvas
          shows through behind the panel (z=0); panel sits at z=10 with
          backdrop-blur for legibility. */}
      <section className="relative z-10 flex min-h-screen flex-col px-6 sm:px-12 md:px-16 py-10">
        <header className="flex items-baseline justify-between">
          <span className="meta-label">
            Cohort · May 2026
          </span>
          <span className="meta-label">
            casepad
          </span>
        </header>

        {/* Hero body — split layout: editorial tagline left, form panel right.
            Both visible from scroll=0 so the top viewport is content-rich
            even before the user scrolls. On mobile, stacks: tagline above form. */}
        <div className="mt-8 flex flex-1 flex-col items-center justify-center gap-12 md:mt-0 md:flex-row md:items-center md:justify-between md:gap-16">
          {/* Editorial tagline — the visual headline now renders inside
              the persistent WebGL scene as 3D extruded type (troika).
              For accessibility we keep an sr-only <h1> in the DOM so
              screen-readers + SEO still see the heading. On mobile + the
              no-3D fallback path, <SignInHeroTagline /> renders the
              full-size visible <h1> instead (delegated to a client
              component that gates on WebGL2 / reduced-motion / viewport). */}
          <div className="max-w-md flex-1 space-y-6 md:max-w-xl">
            <h1 className="sr-only">the room before the room.</h1>
            <SignInHeroTagline />
            <p
              className="font-headline text-base leading-relaxed sm:text-lg"
              style={{
                color: 'var(--color-text-secondary)',
                maxWidth: '36ch',
              }}
            >
              Live case interview practice with Ash — your AI engagement manager. Not a casebook. Not a chatbot. A rehearsal room.
            </p>
          </div>

          {/* Form panel — floats in the right column on desktop, full-width
              on mobile. Semi-transparent backdrop so the asterisk reads through. */}
          <div
            className="w-full max-w-sm space-y-5 rounded-lg p-6 backdrop-blur-md"
            style={{
              background: 'color-mix(in oklab, var(--color-bg-elevated) 70%, transparent)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'color-mix(in oklab, var(--color-border) 60%, transparent)',
            }}
          >
            <div className="space-y-2">
              <h1
                className="font-headline text-xl"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Sign in
              </h1>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Cohort access. Enter the email on the allowlist — we&apos;ll sign you in immediately.
              </p>
            </div>

            {showSessionExpired && (
              <div
                className="rounded-md border p-3 text-xs"
                style={{
                  borderColor: 'var(--color-accent)',
                  color: 'var(--color-accent-bright)',
                  background: 'transparent',
                }}
              >
                Your session expired. Sign in again to pick up where you left off.
              </div>
            )}

            <form action={directSignIn} className="space-y-3">
              <input
                name="email"
                type="email"
                placeholder="you@school.edu"
                required
                autoFocus
                className="w-full rounded-md px-3 py-2.5 text-sm transition-colors focus:outline-none"
                style={{
                  background: 'color-mix(in oklab, var(--color-bg-sunken) 80%, transparent)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
              <button
                type="submit"
                className="w-full rounded-md py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
                style={{
                  background: 'var(--color-accent)',
                  color: 'var(--color-accent-fg)',
                }}
              >
                Sign in
              </button>
              {errMsg && (
                <div
                  className="rounded-md border p-2.5 text-left text-xs"
                  style={{
                    borderColor: 'var(--color-accent)',
                    color: 'var(--color-accent-bright)',
                  }}
                >
                  {errMsg}
                </div>
              )}
            </form>

            <div
              className="text-[11px] leading-relaxed"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Not on the allowlist? Ask the admin (your cohort lead) to add your email at{' '}
              <span className="font-mono">/admin/allowlist</span>.
            </div>

            <div
              className="text-[10px] leading-relaxed"
              style={{ color: 'var(--color-text-muted)' }}
            >
              By signing in, you agree to the{' '}
              <a
                href="/terms"
                className="underline"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Terms of Use
              </a>{' '}
              (allowlist-only · no copying · no scraping · personal use).
            </div>
          </div>
        </div>

        {/* Library content density — horizontal infinite-scroll ticker
            running real case titles. Sits just above the scroll affordance
            so the first viewport carries proof of the library without
            forcing a scroll. */}
        <div className="mt-8">
          <HeroTicker />
        </div>

        {/* Scroll affordance — small hint at the bottom of viewport 1
            so users know there's more below. */}
        <div
          className="meta-label mt-4 flex justify-center"
          aria-hidden="true"
        >
          ↓ scroll
        </div>
      </section>

      {/* Section 3 — What is CasePad + sample chat snippet
          (Reveal 1 was deduped — "the room before the room." now lives
          always-visible inside the hero, not as a scroll-gated section.) */}
      <WhatIsCasePadSection />

      {/* Editorial reveal 2 — "rehearse like it's real." */}
      <SignInEditorialReveal2 />

      {/* Section 4 — Cases preview (3 real cases) */}
      <CasesPreviewSection />

      {/* Editorial reveal 3 — "ASH listens." */}
      <SignInEditorialReveal3 />

      {/* Section 5 — How it works (3 steps) */}
      <HowItWorksSection />

      {/* Section 6 — Founder note */}
      <FounderNoteSection />

      {/* Section 7 — FAQ accordion */}
      <FaqSection />

      {/* Section 8 — Footer */}
      <SignInFooter />
    </main>
  );
}
