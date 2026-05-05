'use client';

import { create } from 'zustand';

// Persistent-asterisk scene store. The 3D mark mounts ONCE in app/layout.tsx
// and lives across all client navigations. Each route declares its preset
// (signin / cases / solve / hidden) via the `useAsteriskScene` hook; the
// canvas's useFrame lerps current state toward `target` every frame, so the
// transition between routes IS the lerp — no remount, no flash, no "day and
// night" feel. ~16 frames at lerp factor 0.05 = ~270ms perceived motion.
//
// All numbers below are intentionally tuned (not LLM-fabricated) — verify
// empirically and adjust to taste:
//   scale     1.0 = full Lusion hero (~viewport-filling at z=5, fov=45)
//             0.35 = mid-presence
//             0.10 = corner-glyph
//             0    = hidden
//   position  viewport-normalized; {0,0,0} = center, {-1,1} = top-left
//             (the canvas converts these to 3D world units)
//   rotationSpeed  revolutions per second
//   particles 0..1, fog 0..1, keyLight 0..~1.2
//
// Two ambient signals layered on top of presets:
//   scrollProgress 0..1 — only the /signin hero writes this. The canvas
//                         reads it to nudge rotation speed (×1..×1.5),
//                         scale (1.0 → 1.15 mid → 0.9 end), and particle
//                         drift. Ignored by all other routes (their
//                         presets don't enable scroll-driven choreography).
//   aiState        'idle' | 'anticipating' | 'thinking' | 'listening'
//                  | 'approving' | 'concerned' | 'celebrating'
//                  Reactive scene-per-app-state. Priority-ordered (see
//                  AI_STATE_PRIORITY) so a higher-priority state can't be
//                  overwritten by a lower one — chat-panel typing won't
//                  interrupt a celebrating burst. States are short-duration
//                  so a full stack isn't necessary. Wired by chat-panel
//                  (anticipating, thinking, approving), mic-button
//                  (listening), sheet-drawer (listening), score-reveal
//                  (approving / concerned / celebrating).

export type AsteriskTarget = {
  scale: number;
  position: { x: number; y: number; z: number };
  rotationSpeed: number;
  enableParallax: boolean;
  particlesIntensity: number;
  fogIntensity: number;
  keyLightIntensity: number;
  // Per-scene Bloom intensity. Tuned per preset: signin (full-bleed mark)
  // wants 0.75; cases/dashboard (small mark in upper-left) want low values
  // (0.4 / 0.35) so the halo doesn't dominate the page.
  bloomIntensity: number;
  // Set per-preset: when true, the canvas applies the scrollProgress-driven
  // multipliers (rotation × 1..1.5, scale ramp, particle velocity boost).
  // Only signin has this enabled.
  scrollChoreography: boolean;
};

export type AsteriskAiState =
  | 'idle'
  | 'anticipating'
  | 'thinking'
  | 'listening'
  | 'approving'
  | 'concerned'
  | 'celebrating';

// Priority order — higher number wins. Lower-priority writes are silently
// dropped. The wire-points fire from many places (chat input, drawer open,
// mic button, score reveal) and can race; this rule keeps the visual
// vocabulary readable. `idle` is the floor; any non-idle state can replace
// it. Setting `idle` always succeeds (it's the explicit reset).
export const AI_STATE_PRIORITY: Record<AsteriskAiState, number> = {
  idle: 0,
  anticipating: 1,
  thinking: 2,
  listening: 3,
  concerned: 4,
  approving: 5,
  celebrating: 6,
};

const PRESET_SIGNIN: AsteriskTarget = {
  scale: 1.0,
  // z=-1.5 — pushes the asterisk back behind the content layer so the
  // headline + form become the focal point. Wide-angle lens (fov=45 at z=5)
  // means the on-screen size barely shrinks, but it reads as "behind."
  position: { x: 0, y: 0, z: -1.5 },
  rotationSpeed: 0.05,
  enableParallax: true,
  particlesIntensity: 0.8,
  fogIntensity: 0.5,
  keyLightIntensity: 1.0,
  bloomIntensity: 0.75,
  scrollChoreography: true,
};

const PRESET_CASES: AsteriskTarget = {
  scale: 0.35,
  position: { x: -0.45, y: 0.4, z: 0 },
  rotationSpeed: 0.08,
  enableParallax: true,
  particlesIntensity: 0.2,
  fogIntensity: 0.1,
  keyLightIntensity: 0.8,
  bloomIntensity: 0.4,
  scrollChoreography: false,
};

// Dashboard sits between cases and signin — a touch more presence than
// the cases-library mark but still corner glyph, low bloom.
const PRESET_DASHBOARD: AsteriskTarget = {
  scale: 0.28,
  position: { x: -0.55, y: 0.35, z: 0 },
  rotationSpeed: 0.04,
  enableParallax: true,
  particlesIntensity: 0.15,
  fogIntensity: 0,
  keyLightIntensity: 0.6,
  bloomIntensity: 0.35,
  scrollChoreography: false,
};

// /solve runs alongside dense chat + tree + drawer content; the asterisk
// needs to be readable enough that Ash can see expression cues (anticipating
// while typing, thinking while streaming, listening on mic/drawer, approving
// on send, concerned/celebrating at debrief). Bumped 2026-05-04 from
// scale 0.10 → 0.22, moved off the corner, and brightened bloom + key light.
const PRESET_SOLVE: AsteriskTarget = {
  scale: 0.22,
  position: { x: -0.72, y: 0.72, z: 0 },
  rotationSpeed: 0.04,
  enableParallax: false,
  particlesIntensity: 0,
  fogIntensity: 0,
  keyLightIntensity: 0.85,
  bloomIntensity: 0.5,
  scrollChoreography: false,
};

const PRESET_HIDDEN: AsteriskTarget = {
  scale: 0,
  position: { x: 0, y: 2, z: 0 },
  rotationSpeed: 0,
  enableParallax: false,
  particlesIntensity: 0,
  fogIntensity: 0,
  keyLightIntensity: 0,
  bloomIntensity: 0,
  scrollChoreography: false,
};

interface AsteriskSceneStore {
  target: AsteriskTarget;
  paused: boolean;
  scrollProgress: number;
  aiState: AsteriskAiState;
  setScene: (partial: Partial<AsteriskTarget>) => void;
  setSignin: () => void;
  setCases: () => void;
  setDashboard: () => void;
  setSolve: () => void;
  setHidden: () => void;
  setBloomIntensity: (v: number) => void;
  setPaused: (p: boolean) => void;
  setScrollProgress: (p: number) => void;
  // setAiState honors AI_STATE_PRIORITY by default — a higher-priority
  // state in flight can't be downgraded. Pass force=true to override
  // (used by useFrame's auto-revert for timed states, where we DO want
  // to drop back to idle). Setting 'idle' explicitly always succeeds.
  setAiState: (s: AsteriskAiState, opts?: { force?: boolean }) => void;
}

export const useAsteriskSceneStore = create<AsteriskSceneStore>((set) => ({
  // Default to signin preset so the very first paint of /signin is correct
  // even before the route's useEffect runs.
  target: { ...PRESET_SIGNIN },
  paused: false,
  scrollProgress: 0,
  aiState: 'idle',
  setScene: (partial) =>
    set((s) => ({ target: { ...s.target, ...partial } })),
  // Switching presets resets scrollProgress so a stale value from /signin
  // doesn't leak into /cases (where scrollChoreography is off, so it
  // wouldn't actually affect anything — but keeping the store tidy avoids
  // gotchas if a future preset opts in).
  setSignin: () => set({ target: { ...PRESET_SIGNIN } }),
  setCases: () => set({ target: { ...PRESET_CASES }, scrollProgress: 0 }),
  setDashboard: () => set({ target: { ...PRESET_DASHBOARD }, scrollProgress: 0 }),
  setSolve: () => set({ target: { ...PRESET_SOLVE }, scrollProgress: 0 }),
  setHidden: () => set({ target: { ...PRESET_HIDDEN }, scrollProgress: 0 }),
  setBloomIntensity: (v) =>
    set((s) => ({ target: { ...s.target, bloomIntensity: v } })),
  setPaused: (p) => set({ paused: p }),
  setScrollProgress: (p) =>
    // Clamp 0..1; defensive against scrollY > scrollHeight on bounce.
    set({ scrollProgress: p < 0 ? 0 : p > 1 ? 1 : p }),
  setAiState: (s, opts) =>
    set((state) => {
      if (opts?.force || s === 'idle') return { aiState: s };
      const cur = AI_STATE_PRIORITY[state.aiState];
      const next = AI_STATE_PRIORITY[s];
      if (next < cur) return state; // drop the write
      return { aiState: s };
    }),
}));

// Exported presets — handy if a future route wants to set a custom blend
// (e.g. "cases preset but with parallax off").
export const ASTERISK_PRESETS = {
  signin: PRESET_SIGNIN,
  cases: PRESET_CASES,
  dashboard: PRESET_DASHBOARD,
  solve: PRESET_SOLVE,
  hidden: PRESET_HIDDEN,
} as const;
