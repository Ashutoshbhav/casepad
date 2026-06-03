import type { Metadata, Viewport } from 'next';
import { Montserrat, IBM_Plex_Mono, Moderustic } from 'next/font/google';
import './globals.css';
import { ConnectionBanner } from '@/components/connection-banner';
import { AuthWatchdog } from '@/components/auth-watchdog';
import { TopNavMount } from '@/components/top-nav-mount';
import { ThemeToggle } from '@/components/theme-toggle';
import { Analytics } from '@vercel/analytics/next';

// Pre-paint script — sets `data-theme` on <html> before React hydrates.
// Defaults to LIGHT now (HUPR is light-canvas first). Reads localStorage
// override if the user explicitly chose dark.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('casepad-theme');if(t!=='light'&&t!=='dark'){t='light';}document.documentElement.setAttribute('data-theme',t);}catch(_){document.documentElement.setAttribute('data-theme','light');}})();`;

// HUPR typography — Montserrat (display, 700 / 900 weights for headings
// and uppercase eyebrows), IBM Plex Mono (body / UI / metadata, the
// dominant text family on the live HUPR site), Moderustic (long-form
// prose). CSS var names preserved (--font-headline / --font-body /
// --font-mono) so existing class hooks keep working.
const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-headline',
  weight: ['400', '500', '600', '700', '900'],
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['400', '500', '700'],
});

const moderustic = Moderustic({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-accent',
  weight: ['400', '500'],
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
};

// Next.js 16 moved themeColor out of `metadata` into its own `viewport`
// export. Keeping it here silences the build warning on every page.
export const viewport: Viewport = {
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
      className={`${montserrat.variable} ${plexMono.variable} ${moderustic.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Theme init must run before any other scripts — sets data-theme
            on <html> from localStorage / system pref before React paints. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-body" suppressHydrationWarning>
        {/* PersistentAsterisk (the WebGL coral 3D mark — Anthropic Liquid-
            Tutor signature) was removed 2026-05-06 as part of the HUPR
            makeover. The canvas, scene presets, and per-route registers
            are no longer mounted; pages that called useAsteriskScene /
            <AsteriskSceneRegister /> render no-ops since their components
            still exist but no consumer is mounted. */}
        <ConnectionBanner />
        <AuthWatchdog />
        <TopNavMount />
        <ThemeToggle />
        {children}
        <Analytics />
        {/* Watermark — present in DOM, not painted */}
        <div aria-hidden="true" style={{ display: 'none' }} data-watermark={WATERMARK} />
      </body>
    </html>
  );
}
