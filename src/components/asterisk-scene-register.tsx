'use client';

import { useAsteriskScene, type AsteriskScenePreset } from '@/hooks/use-asterisk-scene';

// Tiny client island — registers a scene preset on the persistent
// layout-level WebGL canvas. Drop it into a server component to set the
// scene without making the whole page client-rendered. Renders nothing.
//
// Usage:  <AsteriskSceneRegister preset="cases" />

export function AsteriskSceneRegister({ preset }: { preset: AsteriskScenePreset }) {
  useAsteriskScene(preset);
  return null;
}
