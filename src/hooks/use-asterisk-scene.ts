'use client';

import { useEffect } from 'react';
import { useAsteriskSceneStore } from '@/lib/stores/asterisk-scene';

// Per-route hook — declares which scene preset this page wants. The
// persistent canvas (mounted once in app/layout.tsx) picks up the change
// via the Zustand subscription and lerps toward it. Calling this in a
// client component's useEffect guarantees the route's intent is registered
// after hydration; the lerp does the rest.
//
// Pass 'hidden' for routes that shouldn't show the asterisk (admin, drills
// during focus mode, etc.). Routes that don't call the hook inherit
// whatever preset was last set — fine in most cases, but explicit is
// preferable.

export type AsteriskScenePreset = 'signin' | 'cases' | 'dashboard' | 'solve' | 'hidden';

export function useAsteriskScene(preset: AsteriskScenePreset) {
  useEffect(() => {
    const s = useAsteriskSceneStore.getState();
    if (preset === 'signin') s.setSignin();
    else if (preset === 'cases') s.setCases();
    else if (preset === 'dashboard') s.setDashboard();
    else if (preset === 'solve') s.setSolve();
    else s.setHidden();
  }, [preset]);
}

// Imperative pause — wire to /solve's onStreamingChange callback so the
// header glyph stops doing GPU work while chat is streaming.
export function useAsteriskPaused(paused: boolean) {
  useEffect(() => {
    useAsteriskSceneStore.getState().setPaused(paused);
  }, [paused]);
}
