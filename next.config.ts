import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't ship source maps to the browser in production. Source maps reveal
  // the original file structure / variable names — useful for debugging,
  // a free reverse-engineering aid for clone-builders.
  productionBrowserSourceMaps: false,

  // Tighten powered-by header (default reveals "X-Powered-By: Next.js").
  poweredByHeader: false,
};

export default nextConfig;
