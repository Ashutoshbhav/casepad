'use client';

// Wave C: Fire Opal sketchy underline used beneath the production
// /debrief ScoreReveal. Imports the v2 SketchyUnderline directly.
// Width-capped + centered so it sits visually under the 120px italic
// score numeral.

import { SketchyUnderline } from '@/app/design-lab/v2/_components/sketchy';

export function DebriefScoreUnderline() {
  return (
    <div
      style={{
        width: 'min(220px, 30vw)',
        margin: '4px auto 24px',
      }}
    >
      <SketchyUnderline
        stroke="#f65726"
        strokeWidth={5}
        roughness={2.4}
        bowing={4}
      />
    </div>
  );
}
