'use client';

// HideAsterisk — tiny client island that fires useAsteriskScene('hidden')
// on mount so the production 3D coral asterisk doesn't render behind any
// /design-lab/v2/* route. The v2 system uses a typographic asterisk (✱)
// in its wordmarks; the 3D one is from the prior brand and doesn't fit.
// Production routes keep their asterisk — only v2 routes get it hidden.
// Renders null so it's invisible in the DOM tree.

import { useAsteriskScene } from '@/hooks/use-asterisk-scene';

export function HideAsterisk() {
  useAsteriskScene('hidden');
  return null;
}
