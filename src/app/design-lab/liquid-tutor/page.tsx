import { requireAdminOrFallback } from '../_lib/admin-gate';
import { LiquidTutorView } from './_components/LiquidTutorView';

export const metadata = {
  title: 'Design Lab v2 - Liquid Tutor',
  robots: { index: false, follow: false },
};

export default async function LiquidTutorPage() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;

  return (
    <>
      {/* Page-scoped Google Fonts: Instrument Serif, Geist, Geist Mono. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap"
      />

      <LiquidTutorView />
    </>
  );
}
