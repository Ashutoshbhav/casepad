// /auth/signin — production cohort sign-in.
//
// Wave C promotion (2026-05-06): visual layer ported from
// /design-lab/v2/signin (HUPR-flavor + multi-Refero borrowings).
// Old WebGL editorial landing page (3D extruded headline, Lusion-grade
// scroll reveals, 6 content sections) was decommissioned with explicit
// approval — see git log "wave C — promote /auth/signin to v2 HUPR".
//
// What's preserved from the prior page:
//   - directSignIn server action — email-only allowlist auth, no
//     magic-link inbox round-trip, redirects to /cases on success
//   - searchParams handling: ?error=... renders inline error message,
//     ?return_to=... preserved as hidden form field
//   - showSessionExpired banner when user was redirected back
//
// Visual composition (HUPR-flavor):
//   - Full-bleed boardroom photo carousel (3-shot crossfade, 7.5s)
//   - Rough.js decision-tree overlay, random framework per visit
//   - Top-left CASEPAD wordmark + caption
//   - Top-right MENU pill (asymmetric 0 0 8px 8px — Anthropic library tab)
//   - Right-side cohort sign-in card on Notion 5-stop soft shadow
//   - Vanta pill input + Zed orange focus state
//   - Onyx Outline #f54e00 CTA with Ed Hinrichsen stamped shadow
//   - Bottom marquee (smaller, faster — 16s loop)
//   - HideAsterisk: the 3D coral asterisk is hidden on this page so
//     the photo + tree composition reads cleanly

import { IBM_Plex_Mono, Montserrat } from 'next/font/google';
import { directSignIn } from '@/server-actions/direct-signin';
import { SigninClient } from './client';

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

const ERROR_MESSAGES: Record<string, string> = {
  'missing-email':    'Please enter your email.',
  'invalid-email':    'That doesn’t look like a valid email.',
  'link-mint-failed': 'Couldn’t prepare your sign-in. Try again in a moment.',
  'verify-failed':    'Sign-in failed. Try again — if this keeps happening, ping the admin.',
  'expired':          'Your session expired. Sign in again to pick up where you left off.',
  'exchange':         'Sign-in link is invalid or expired. Try entering your email again.',
  'otp':              'Sign-in code is invalid or expired. Try entering your email again.',
  'rate-limited':     'Too many sign-in attempts. Please wait a minute and try again.',
};

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
      className={`v2-signin-scope ${plexMono.variable} ${montserrat.variable}`}
      style={{
        // Wave C scroll fix (2026-05-06): was position:fixed +
        // overflow:hidden which trapped users in a single viewport on
        // small screens. Now a relative container at 100vh minimum, so
        // small-screen content can flow + scroll naturally.
        position: 'relative',
        minHeight: '100vh',
        background: '#0E0E0E',
        color: 'rgb(50,50,52)',
        fontFamily: 'var(--font-v2-mono)',
        overflowX: 'hidden',
      }}
    >
      <SigninClient
        action={directSignIn}
        errMsg={errMsg}
        returnTo={returnTo}
        showSessionExpired={showSessionExpired}
      />
    </main>
  );
}
