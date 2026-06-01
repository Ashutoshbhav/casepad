'use client';

// Client leaf for a case-row placard photo.
//
// WHY THIS EXISTS: the <img> needs an onError handler to swap to the bundled
// fallback photo when a case's per-case image hasn't been generated yet (the
// Supabase Storage URL 404s). Event handlers can't live in a Server Component,
// and hupr-case-row.tsx is a Server Component — passing onError there throws
// "Event handlers cannot be passed to Client Component props", which crashed
// the whole /cases render. Isolating just the <img> in this client leaf keeps
// the row itself a Server Component while making the handler legal.

import { caseImageFor, caseImageFallback } from '@/lib/case-images/picker';

export function CaseRowImage({ caseId }: { caseId: string }) {
  return (
    <img
      src={caseImageFor(caseId)}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      onError={(e) => {
        const el = e.currentTarget;
        const fallback = caseImageFallback(caseId);
        if (el.src.endsWith(fallback)) return; // already fell back
        el.src = fallback;
      }}
      className="absolute inset-0 w-full h-full object-cover"
      style={{
        filter: 'brightness(0.72) saturate(0.88)',
        opacity: 0.95,
        mixBlendMode: 'multiply',
      }}
    />
  );
}
