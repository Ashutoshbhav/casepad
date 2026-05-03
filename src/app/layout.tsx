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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConnectionBanner />
        <AuthWatchdog />
        <TopNavMount />
        {children}
      </body>
    </html>
  );
}
