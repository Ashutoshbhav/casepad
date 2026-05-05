'use client';

// Re-export the shared BreathingOrb. This file used to host the source; it
// was promoted to src/components/breathing-orb.tsx so production surfaces
// (chat panel, solve header) can import the same component. Kept as a thin
// re-export so design-lab imports continue to work unchanged.

export { BreathingOrb, type OrbState } from '@/components/breathing-orb';
