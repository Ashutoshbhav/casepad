import type { NextConfig } from "next";

// Production security headers applied to every response. Pre-launch gap:
// next.config had no headers() function at all, so the site shipped with
// no HSTS, no clickjacking protection, no MIME-sniff protection, no
// referrer policy, no Permissions-Policy.
//
// CSP intentionally not enforced here — it's risky to ship without a
// staging-mode soak first, and the bigger wins are below. Add CSP in a
// follow-up after observing real usage (preferably in report-only mode
// first).
const SECURITY_HEADERS = [
  // 2-year HSTS with subdomain + preload. Forces HTTPS on every browser
  // that ever sees a single response. Once preload-listed, irreversible
  // for the domain — only enable when you're sure HTTPS-only is the
  // permanent direction. Vercel deploys are HTTPS-only by default.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Clickjacking defense — refuse to be framed by anyone. We don't embed
  // our own pages in iframes, so DENY is safer than SAMEORIGIN.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Disable MIME-type sniffing — browsers must honor the declared
  // Content-Type. Stops a class of XSS where a malformed upload is
  // re-interpreted as a script.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Trim what we leak to other origins in the Referer header. Same-origin
  // gets full referrer; cross-origin gets just the origin (no path).
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Lock down sensitive browser APIs. We use mic (MicButton); allow that
  // self-only. Camera kept self-only in case a webcam-mirror corner ships
  // later. Deny everything else by default.
  {
    key: 'Permissions-Policy',
    value: [
      'camera=(self)',
      'microphone=(self)',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'accelerometer=()',
      'gyroscope=()',
    ].join(', '),
  },
];

const nextConfig: NextConfig = {
  // Don't ship source maps to the browser in production. Source maps reveal
  // the original file structure / variable names — useful for debugging,
  // a free reverse-engineering aid for clone-builders.
  productionBrowserSourceMaps: false,

  // Tighten powered-by header (default reveals "X-Powered-By: Next.js").
  poweredByHeader: false,

  // Apply security headers to every route (HTML, API, static).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ];
  },

  // Enable React's <ViewTransition> component for smooth cross-fades on
  // route nav (/cases → /solve → /debrief). Browser-native API, fully
  // GPU-driven; we keep durations short and respect prefers-reduced-motion
  // through the `::view-transition-*` rules in globals.css.
  experimental: {
    viewTransition: true,
  },

  // Three.js ships ESM-only modules that occasionally trip Next's default
  // transform pipeline. Listing it here forces Next to run it through the
  // SWC pipeline like first-party code. Only used by the dynamically-
  // imported Signin3DHero — never reaches mobile bundles.
  transpilePackages: ['three'],
};

export default nextConfig;
