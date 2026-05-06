'use client';

// Wave C: sketchy ink underline beneath the /dashboard greeting
// headline. Picks up the Rough.js DNA from /design-lab/v2 — same
// hand-drawn editorial mark used on /debrief score reveal.

import { SketchyUnderline } from '@/app/design-lab/v2/_components/sketchy';

export function DashboardHeroUnderline() {
  return (
    <div
      style={{
        width: 'min(360px, 30vw)',
        marginTop: 12,
      }}
    >
      <SketchyUnderline
        stroke="var(--color-text-primary)"
        strokeWidth={5}
        roughness={2.4}
        bowing={4}
      />
    </div>
  );
}
