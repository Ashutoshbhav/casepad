import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't ship source maps to the browser in production. Source maps reveal
  // the original file structure / variable names — useful for debugging,
  // a free reverse-engineering aid for clone-builders.
  productionBrowserSourceMaps: false,

  // Tighten powered-by header (default reveals "X-Powered-By: Next.js").
  poweredByHeader: false,

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
