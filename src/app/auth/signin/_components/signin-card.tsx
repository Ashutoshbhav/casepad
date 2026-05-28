// Signin card — drops into HUPR's hero floating-right-card slot.
//
// Anchored to the Refero ElevenLabs treatment ("architect's blueprint on warm
// vellum") for the visual reskin shipped 2026-05-29:
//   - eggshell card surface (#fdfcfc, not pure white) so the card lifts off
//     HUPR's hero photo background by warmth, not by a heavy drop-shadow
//   - 0.5px inset hairline + 1px outer for the card chrome; zero drop-shadow
//   - chalk dividers (#e5e5e5), gravel secondary text (#777169) — warm stone,
//     not the cold rgba grays that read as "AI default"
//   - input is transparent with a 1px border-bottom only and 0px radius
//   - both CTAs are obsidian pills (9999px) using HUPR's existing #323234 ink
//     (not pure black; preserves cross-surface ink consistency)
//
// Type stays HUPR (IBM Plex Mono body + Montserrat 700 eyebrow). No font
// swap. The single eyebrow on this card is the cap allowed by impeccable's
// eyebrow restraint rule (max 1 per card / per 3 sections); no others
// stacked anywhere else on the page.
//
// Em-dashes are banned everywhere on visible copy (taste-skill 9.G) — the
// previous copy used them in two places, both rewritten as separate
// sentences with periods.
//
// Motion: deliberately minimal per the anchor (zero motion / restraint is
// the point). The narrow motion that DOES exist (button press feedback,
// input focus) follows Emil's craft rules: exact transition properties
// (never `transition: all`), strong cubic-bezier ease-out, sub-200ms,
// scale(0.97) on :active, and a `prefers-reduced-motion` no-op so the
// transitions disable for sensitive users. Hover-only states are gated
// behind `(hover: hover) and (pointer: fine)` so touch devices don't
// trigger false hover from a tap.

import { directSignIn } from '@/server-actions/direct-signin';
import { GoogleSignInButton } from '@/components/auth/google-signin-button';

const ERROR_MESSAGES: Record<string, string> = {
  'missing-email': 'Please enter your email.',
  'invalid-email': 'That doesn’t look like a valid email.',
  'link-mint-failed': 'Couldn’t prepare your sign-in. Try again in a moment.',
  'verify-failed': 'Sign-in failed. Try again, or ping the admin if it keeps happening.',
  'expired': 'Your session expired. Sign in again to pick up where you left off.',
  'exchange': 'Sign-in link is invalid or expired. Try entering your email again.',
  'otp': 'Sign-in code is invalid or expired. Try entering your email again.',
  'rate-limited': 'Too many sign-in attempts. Please wait a minute and try again.',
};

export function SignInCard({
  errorCode,
  returnTo,
  showSessionExpired,
}: {
  errorCode?: string;
  returnTo?: string;
  showSessionExpired?: boolean;
}) {
  const errMsg = errorCode ? ERROR_MESSAGES[errorCode] : null;

  return (
    <div
      className="casepad-signin-card"
      style={{
        background: '#fdfcfc',
        padding: '2rem',
        borderRadius: 4,
        color: '#323234',
        // Hairline float — no drop-shadow. 0.5px inset gives the card a
        // crisp interior edge; the outer 1px shadow gives it just enough
        // separation from the hero photo behind it.
        boxShadow:
          '0 0 0 0.5px rgba(0, 0, 0, 0.075) inset, 0 0 1px 0 rgba(0, 0, 0, 0.4)',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: '#323234',
          margin: 0,
        }}
      >
        Sign in
      </h2>
      <hr
        style={{
          border: 0,
          borderTop: '1px solid #e5e5e5',
          margin: '10px 0 18px',
          width: '100%',
        }}
      />
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          lineHeight: 1.55,
          color: '#777169',
          margin: 0,
        }}
      >
        Continue with Google, or enter your email below. Either way you&apos;re in
        immediately. No magic link, no password.
      </p>

      <div style={{ marginTop: 20 }}>
        <GoogleSignInButton returnTo={returnTo} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '20px 0 6px',
          color: '#777169',
          fontFamily: 'var(--font-body)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
        }}
        aria-hidden="true"
      >
        <span style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
        <span>or email</span>
        <span style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
      </div>

      {showSessionExpired && (
        <div
          style={{
            marginTop: 14,
            padding: '10px 12px',
            border: '1px solid #e5e5e5',
            background: 'rgba(50, 50, 52, 0.03)',
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#323234',
            borderRadius: 3,
          }}
        >
          Your session expired. Sign in again to continue.
        </div>
      )}

      <form action={directSignIn} className="mt-4 space-y-3">
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="you@school.edu"
          required
          autoFocus
          className="casepad-signin-input w-full"
          style={{
            background: 'transparent',
            border: 0,
            borderBottom: '1px solid #e5e5e5',
            padding: '10px 2px',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: '#323234',
            borderRadius: 0,
            outline: 'none',
          }}
        />
        {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
        <button
          type="submit"
          className="casepad-signin-submit w-full"
          style={{
            background: '#323234',
            color: '#FFFFFF',
            padding: '11px 20px',
            borderRadius: 9999,
            border: 0,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            fontWeight: 500,
            // Specify exact properties per Emil's "never transition: all"
            // rule. Background + transform only — both are GPU-cheap and
            // both will be the only properties actually changing.
            transition:
              'background-color 180ms cubic-bezier(0.23, 1, 0.32, 1), transform 120ms cubic-bezier(0.23, 1, 0.32, 1)',
            willChange: 'transform',
          }}
        >
          Sign in
        </button>
        {errMsg && (
          <div
            role="alert"
            style={{
              padding: '8px 10px',
              border: '1px solid #b33c3c',
              color: '#b33c3c',
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              borderRadius: 3,
              background: 'rgba(179, 60, 60, 0.04)',
            }}
          >
            {errMsg}
          </div>
        )}
      </form>

      <div
        style={{
          marginTop: 14,
          fontFamily: 'var(--font-body)',
          fontSize: 10,
          lineHeight: 1.6,
          color: '#777169',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        By signing in, you agree to the{' '}
        <a
          href="/terms"
          style={{ color: '#323234', textDecoration: 'underline' }}
        >
          Terms of Use
        </a>
        .
      </div>

      {/*
        :hover / :active / :focus / ::placeholder rules live in
        src/app/globals.css (the SignInCard is a Server Component and
        cannot use styled-jsx). Search for "SignInCard reskin" in that
        file for the matching CSS. */}
    </div>
  );
}

