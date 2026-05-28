// Signin card — drops into HUPR's hero floating-right-card slot.
//
// Wraps the existing `directSignIn` server action. Behavior identical to
// the previous signin form: server action mints a session immediately if
// the email is on the allowlist, otherwise redirects with ?error=. The
// only thing that changes is the visual treatment — pure HUPR (#FFFFFF
// card on photo bg, #323234 ink, IBM Plex Mono input + button).

import { directSignIn } from '@/server-actions/direct-signin';
import { GoogleSignInButton } from '@/components/auth/google-signin-button';

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
      style={{
        background: '#FFFFFF',
        padding: '2rem',
        borderRadius: 4,
        color: '#323234',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-body)',
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
          margin: '8px 0 20px',
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
        Continue with Google, or enter your email below. Either way you&apos;re
        in immediately — no magic link, no password.
      </p>

      <div style={{ marginTop: 18 }}>
        <GoogleSignInButton returnTo={returnTo} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '18px 0 4px',
          color: 'rgba(50,50,52,0.55)',
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}
        aria-hidden="true"
      >
        <span style={{ flex: 1, height: 1, background: 'rgba(50,50,52,0.18)' }} />
        <span>or email</span>
        <span style={{ flex: 1, height: 1, background: 'rgba(50,50,52,0.18)' }} />
      </div>

      {showSessionExpired && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: '1px solid #323234',
            fontFamily: 'var(--font-body)',
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

      <form action={directSignIn} className="mt-5 space-y-3">
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
          className="w-full"
          style={{
            background: '#f4f4f4',
            border: '1px solid #e8e8e8',
            padding: '12px 14px',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: '#323234',
            borderRadius: 3,
            outline: 'none',
            // textTransform removed: emails display as the user typed them.
          }}
        />
        {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
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
            fontFamily: 'var(--font-body)',
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
              fontFamily: 'var(--font-body)',
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

      {/* Allowlist-mode footer removed 2026-05-29 — open signup is now
          the default behaviour (ALLOWLIST_MODE=open), so directing
          new users to "ask the admin" was misleading. */}

      <div
        style={{
          marginTop: 10,
          fontFamily: 'var(--font-body)',
          fontSize: 10,
          lineHeight: 1.6,
          color: 'rgba(50,50,52,0.55)',
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
    </div>
  );
}
