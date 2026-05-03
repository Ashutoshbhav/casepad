import type { Metadata } from 'next';
import './globals.css';
import { ConnectionBanner } from '@/components/connection-banner';
import { AuthWatchdog } from '@/components/auth-watchdog';
import { TopNavMount } from '@/components/top-nav-mount';

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
  themeColor: '#10b981',
};

// Watermark — copyright + author embedded as data attributes on every page.
// Doesn't prevent cloning, but bakes attribution into the DOM so any verbatim
// copy carries the original author's mark. Author + copyright meta tags are
// declared via the metadata export above.
const WATERMARK = '© 2026 Ashutosh Bhavale — CasePad. All rights reserved. Proprietary software, allowlist-only access.';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-app="casepad" data-author="ashutosh-bhavale">
      <body>
        <ConnectionBanner />
        <AuthWatchdog />
        <TopNavMount />
        {children}
        {/* Watermark — present in DOM, not painted */}
        <div aria-hidden="true" style={{ display: 'none' }} data-watermark={WATERMARK} />
      </body>
    </html>
  );
}
