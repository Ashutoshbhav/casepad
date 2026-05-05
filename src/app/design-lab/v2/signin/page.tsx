// /design-lab/v2/signin — HUPR-flavor signin landing
//
// Server wrapper handling the admin gate + font registration. All
// interactive state (carousel rotation, tree topology pick, pagination
// indicator) lives in the client component below.

import { IBM_Plex_Mono, Montserrat } from 'next/font/google';
import { requireAdminOrFallback } from '../../_lib/admin-gate';
import { SigninCarouselClient } from './client';

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
  title: 'Design Lab v2 — Signin',
  robots: { index: false },
};

export default async function SigninV2Page() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  return (
    <main
      className={`v2-signin-scope ${plexMono.variable} ${montserrat.variable}`}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0E0E0E',
        color: 'rgb(50,50,52)',
        fontFamily: 'var(--font-v2-mono)',
        overflow: 'hidden',
      }}
    >
      <SigninCarouselClient />
    </main>
  );
}
