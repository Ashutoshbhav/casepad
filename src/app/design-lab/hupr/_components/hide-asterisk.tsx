'use client';

// HUPR routes hide the global 3D coral asterisk — HUPR's visual
// system has no character mascot, just clean photo-led editorial.

import { useAsteriskScene } from '@/hooks/use-asterisk-scene';

export function HideAsterisk() {
  useAsteriskScene('hidden');
  return null;
}
