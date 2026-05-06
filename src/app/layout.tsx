import type { Metadata } from 'next';
import { Instrument_Serif, IBM_Plex_Mono, Montserrat } from 'next/font/google';
import './globals.css';
import { ConnectionBanner } from '@/components/connection-banner';
import { AuthWatchdog } from '@/components/auth-watchdog';
import { TopNavMount } from '@/components/top-nav-mount';
import { ThemeToggle } from '@/components/theme-toggle';
import PersistentAsterisk from './_components/persistent-asterisk';

// Pre-paint script — sets `data-theme` on <html> before React hydrates.
// Reads localStorage first (user's saved choice), falls back to system
// `prefers-color-scheme`, defaults to 'dark'. Runs synchronously inside
// <head> so the page is already styled correctly before paint — no flash.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('casepad-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(_){document.documentElement.setAttribute('data-theme','dark');}})();`;

// HUPR-flavor typography (Wave C — locked 2026-05-06).
// Two fonts in two roles, plus Instrument Serif kept as a tertiary
// italic-capable serif for editorial moments where mixed-case italic
// reads better than caps. CSS var names preserved across the codebase.
//
//   --font-headline  → Montserrat 700/800 — billboard caps display.
//                      The v2 sample's "COFFEE CHAIN PROFITABILITY."
//                      look. Replaces Instrument Serif italic as the
//                      primary headline face.
//   --font-body      → IBM Plex Mono 400/500 — body / UI text. Replaces
//                      Geist sans. Pairs with Montserrat caps for the
//                      HUPR editorial-tech voice.
//   --font-mono      → IBM Plex Mono 400/500 — same face as body so
//                      tabular numerals + telemetry text feel native.
//   --font-serif     → Instrument Serif italic — kept on the same DOM
//                      node so .font-serif (or font-headline-italic)
//                      utilities can opt back to italic editorial type
//                      where the v2 sample uses it (e.g. score reveal).
const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-headline',
  weight: ['400', '500', '700', '800'],
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['400', '500'],
});

const plexMonoMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500'],
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  weight: '400',
  style: ['normal', 'italic'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://casepad.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'CasePad', template: '%s · CasePad' },
  description: 'Cohort case interview practice — solve, drill, debrief. 1,100+ real cases across consulting, IB, PM, marketing, and strategy tracks.',
  openGraph: {
    title: 'CasePad',
    description: 'Cohort case interview practice — solve, drill, debrief.',
    url: siteUrl,
    siteName: 'CasePad',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CasePad',
    description: 'Cohort case interview practice — solve, drill, debrief.',
  },
  robots: { index: false, follow: false },
  authors: [{ name: 'Ashutosh Bhavale' }],
  creator: 'Ashutosh Bhavale',
  publisher: 'Ashutosh Bhavale',
  other: {
    'copyright': '© 2026 Ashutosh Bhavale — All rights reserved',
    'license': 'Proprietary — see /terms',
  },
  // PWA + favicon
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'CasePad',
    statusBarStyle: 'black-translucent',
  },
  themeColor: '#000000',
};

// Watermark — copyright + author embedded as data attributes on every page.
// Doesn't prevent cloning, but bakes attribution into the DOM so any verbatim
// copy carries the original author's mark. Author + copyright meta tags are
// declared via the metadata export above.
const WATERMARK = '© 2026 Ashutosh Bhavale — CasePad. All rights reserved. Proprietary software, allowlist-only access.';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-app="casepad"
      data-author="ashutosh-bhavale"
      className={`${montserrat.variable} ${plexMono.variable} ${plexMonoMono.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Theme init must run before any other scripts — sets data-theme
            on <html> from localStorage / system pref before React paints. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-body" suppressHydrationWarning>
        {/* Persistent layout-level WebGL canvas — the 3D coral asterisk
            lives here, mounted once and shared across all routes. Each
            route declares its preset via `useAsteriskScene`; the canvas
            lerps current state toward target every frame, so navigation
            transitions ARE the lerp (no remount). Skips itself on mobile,
            no-WebGL2, and reduced-motion. zIndex 0, pointer-events-none. */}
        <PersistentAsterisk />
        <ConnectionBanner />
        <AuthWatchdog />
        <TopNavMount />
        <ThemeToggle />
        {/* Note: previously wrapped in `<ViewTransition>{children}</ViewTransition>`
            from React. That symbol is experimental-channel-only — it does NOT
            exist in react@19.2.4 stable, so the import resolved to `undefined`
            and JSX rendered `<undefined>`, which SSR tolerates but client
            hydration throws on ("Element type is invalid"). Hydration aborts
            mid-tree → no event listeners bind → every page becomes static text.
            CSS view-transition rules in globals.css continue to drive the
            cross-fade via the browser's native API; no wrapper needed. */}
        {children}
        {/* Watermark — present in DOM, not painted */}
        <div aria-hidden="true" style={{ display: 'none' }} data-watermark={WATERMARK} />
      </body>
    </html>
  );
}
