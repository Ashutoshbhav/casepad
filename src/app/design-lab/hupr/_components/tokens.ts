// /design-lab/hupr — verified HUPR tokens.
//
// Forensically extracted from
// https://hupr.ca/wp-content/themes/hupr/assets/dist/css/main.css
// on 2026-05-06. NOT a synthesis. NOT my interpretation. These are
// the actual values HUPR ships in production.
//
// HUPR is monochromatic — no accent color. Primary action is a plain
// #323234 dark-fill rectangle on white. Hover surface is #f4f4f4.
// Borders are #e8e8e8 hairlines. That's the full chromatic system.

export const COLORS = {
  // Surfaces
  canvas: '#FFFFFF',         // page bg
  sunken: '#f4f4f4',         // hover / inset / secondary surface
  inverse: '#323234',        // dark sections, footer, button fill
  inverseSoft: '#1c1c1c',    // slightly deeper dark for hover on inverse

  // Ink
  text: '#323234',           // primary body + heading text (NOT pure black)
  textMuted: 'rgba(50,50,52,0.65)', // secondary text
  textOnDark: '#FFFFFF',     // text on #323234 surfaces

  // Borders
  border: '#e8e8e8',         // hairline dividers
  borderOnDark: 'rgba(255,255,255,0.15)',
} as const;

// Type scale — Montserrat for display headings, mixed case (NOT caps).
// IBM Plex Mono for body / UI / metadata. Moderustic for accent moments
// (eyebrows, occasional editorial flourish).
export const TYPE = {
  caption:  { size: 11, leading: 1.4, tracking: '0.04em' },
  body:     { size: 15, leading: 1.55, tracking: '0' },
  bodyLg:   { size: 17, leading: 1.55, tracking: '0' },
  hSm:      { size: 22, leading: 1.25, tracking: '-0.005em' },
  h:        { size: 32, leading: 1.15, tracking: '-0.01em' },
  hLg:      { size: 48, leading: 1.05, tracking: '-0.015em' },
  display:  { size: 72, leading: 1.0, tracking: '-0.02em' },
} as const;

// Spacing — HUPR uses generous whitespace; 8/16/24/40/64/96 scale.
export const SPACE = [4, 8, 12, 16, 24, 32, 40, 56, 80, 120] as const;

// Radius — HUPR uses minimal rounding (not pills). 0px on most surfaces,
// 4px on cards.
export const RADIUS = {
  sm: 0,
  cards: 4,
  buttons: 0,
} as const;

// Font CSS variable names — set by next/font in page.tsx.
export const FONTS = {
  display: 'var(--font-hupr-display)', // Montserrat
  body:    'var(--font-hupr-body)',    // IBM Plex Mono
  accent:  'var(--font-hupr-accent)',  // Moderustic
} as const;
