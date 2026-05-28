'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

// "Sign in with Google" — kicks off Supabase Auth's OAuth flow with the
// google provider. The OAuth round-trip ultimately lands at our
// /auth/callback route, which we already wrote to handle the ?code=
// (PKCE) variant — see src/app/auth/callback/route.ts. There, the
// existing isEmailAllowed() check runs against the returned google
// email; with ALLOWLIST_MODE=open it passes for any verified email.
//
// `redirectTo` carries the user back to our origin's /auth/callback
// (NOT Supabase's hosted callback) so cookies land on our domain. The
// `return_to` query, if present, threads through both round-trips.
//
// IMPORTANT: This only works once the Supabase project has the Google
// provider enabled (Authentication → Providers → Google → Enabled,
// with the Google Cloud OAuth Client ID + Secret pasted in). Until
// that one-time config exists, clicking the button surfaces a clear
// "provider not enabled" error from Supabase.

export function GoogleSignInButton({ returnTo }: { returnTo?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const origin = window.location.origin;
      const callbackPath = '/auth/callback';
      const safeReturnTo =
        returnTo &&
        returnTo.startsWith('/') &&
        !returnTo.startsWith('//') &&
        !returnTo.startsWith('/auth')
          ? returnTo
          : null;
      const redirectTo = safeReturnTo
        ? `${origin}${callbackPath}?return_to=${encodeURIComponent(safeReturnTo)}`
        : `${origin}${callbackPath}`;

      const { error: signErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (signErr) {
        console.error('[google-signin] signInWithOAuth failed:', signErr);
        setError(signErr.message || 'Could not start Google sign-in.');
        setPending(false);
      }
      // On success, the browser is redirected to Google's consent page —
      // we never return to this component, so no state cleanup needed.
    } catch (err) {
      console.error('[google-signin] threw:', err);
      setError('Could not start Google sign-in. Try again.');
      setPending(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label="Sign in with Google"
        className="casepad-google-btn"
        style={{
          width: '100%',
          // Eggshell-on-eggshell would vanish — use clean white so the
          // Google glyph reads and the button has a clear edge against
          // the card surface (#fdfcfc).
          background: '#FFFFFF',
          color: '#323234',
          padding: '11px 20px',
          // Pill to match the email submit button (Section 4.4 shape
          // consistency lock — one radius system per surface).
          borderRadius: 9999,
          // Chalk hairline, not a heavy ink border — matches the
          // ElevenLabs anchor's "single 0.5px inset hairline" treatment.
          border: '1px solid #e5e5e5',
          cursor: pending ? 'wait' : 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          fontWeight: 500,
          textTransform: 'none',
          letterSpacing: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          opacity: pending ? 0.6 : 1,
          // Same transition discipline as the email submit: exact
          // properties only (never `all`), strong ease-out cubic, sub-200ms.
          transition:
            'border-color 180ms cubic-bezier(0.23, 1, 0.32, 1), transform 120ms cubic-bezier(0.23, 1, 0.32, 1)',
          willChange: 'transform',
        }}
      >
        <GoogleGlyph />
        <span>{pending ? 'Redirecting to Google…' : 'Continue with Google'}</span>
      </button>
      <style jsx>{`
        @media (hover: hover) and (pointer: fine) {
          .casepad-google-btn:hover {
            border-color: #323234;
          }
        }
        .casepad-google-btn:active {
          transform: scale(0.97);
        }
        @media (prefers-reduced-motion: reduce) {
          .casepad-google-btn {
            transition: none;
          }
          .casepad-google-btn:active {
            transform: none;
          }
        }
      `}</style>
      {error && (
        <div
          role="alert"
          style={{
            marginTop: 8,
            padding: 8,
            border: '1px solid #b33c3c',
            color: '#b33c3c',
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            borderRadius: 3,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function GoogleGlyph() {
  // Inline SVG of the Google "G" — official multi-color mark. Avoids a
  // network request for an icon file. Sized to sit cleanly next to body
  // text at ~18px.
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
