import type { Metadata } from 'next';
import { Instrument_Serif, Geist, Geist_Mono } from 'next/font/google';
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

// Liquid Tutor typography — Instrument Serif (headline, italic-capable),
// Geist (body / UI), Geist Mono (mono / telemetry). All free Google Fonts,
// self-hosted via next/font. CSS var names preserved (--font-headline /
// --font-body / --font-mono) so existing class hooks keep working.
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-headline',
  weight: '400',
  style: ['normal', 'italic'],
});

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
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
      className={`${instrumentSerif.variable} ${geist.variable} ${geistMono.variable}`}
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
