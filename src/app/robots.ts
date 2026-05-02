import type { MetadataRoute } from 'next';

// Private cohort tool — keep out of search engines.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  };
}
