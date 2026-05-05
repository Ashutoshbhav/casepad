// Motion tokens — single source of truth for the entire motion layer.
//
// Every animation in the production app imports from here. Inline ad-hoc
// spring/easing/duration objects are forbidden; if a need arises that
// the dictionary doesn't cover, add a new token here rather than
// scattering numbers across components.
//
// Tuning rationale
// ----------------
// SPRING.micro    — buttons, hover, focus. Snappy, decisive. Settles in ~200ms.
// SPRING.smooth   — content entrances (cards, headlines, list rows). ~400ms feel.
// SPRING.atmos    — hero-class reveals, big editorial entrances. Heavier, slower.
// SPRING.modal    — drawer / modal slide-ins. Same as micro for the snap, but
//                    framed separately so future tweaks don't accidentally
//                    drag along ghost-button hover behaviour.
//
// EASE.expo       — Apple-style "soft start, decisive end". Universal default
//                    for non-spring transitions (opacity fades, color crossfades).
// EASE.emphasis   — Anticipatory bounce-out for celebratory beats only
//                    (score reveal number arrival, milestone pulses).
//
// DURATION.micro  — opacity-only color/border crossfades on hover.
// DURATION.smooth — content reveals (text fades, card eyebrows).
// DURATION.atmos  — hero entrances, expensive cross-fades.
// DURATION.view   — view-transition cross-fade duration; matches CSS in globals.css.
//
// Property rule (enforced by callers, not the tokens):
//   ONLY animate transform / opacity / filter / color / background-color.
//   NEVER animate width / height / top / left / right / bottom / padding /
//   margin / border-width.
//
// Reduced-motion rule: callers wrap the import in `useReducedMotion()` and
// short-circuit to `{ duration: 0 }` (or skip entirely for loops).

export const SPRING = {
  micro: { type: 'spring', stiffness: 380, damping: 36, mass: 1 } as const,
  smooth: { type: 'spring', stiffness: 220, damping: 28, mass: 1 } as const,
  atmos: { type: 'spring', stiffness: 160, damping: 24, mass: 1.2 } as const,
  modal: { type: 'spring', stiffness: 380, damping: 36, mass: 1 } as const,
} as const;

export const EASE = {
  expo: [0.32, 0.72, 0, 1] as [number, number, number, number],
  emphasis: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
} as const;

export const DURATION = {
  micro: 0.18,
  smooth: 0.32,
  atmos: 0.6,
  view: 0.48,
} as const;

// Reduced-motion-safe instant transition. Avoids `repeat: Infinity` accidents
// when callers reuse the same transition object for both reduced and full
// motion paths.
export const INSTANT = { duration: 0 } as const;
