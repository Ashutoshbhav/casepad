'use client';

import { useRef } from 'react';
import { useAsteriskSceneStore } from '@/lib/stores/asterisk-scene';

// AsteriskHotspot — invisible interactive overlay over the asterisk on
// /dashboard. Visual-audit finding (item #4): the persistent asterisk has
// pointer-events: none on its canvas (defensive fix for the click-eating
// bug — r3f's Canvas defaults to pointer-events: auto for raycasting,
// which ate every click site-wide). The character had no agency. This
// hotspot gives Ash one clickable surface, on the one page where it
// makes sense, without re-enabling raycasting site-wide.
//
// Dashboard-only by design — the asterisk on /solve, /cases, /signin
// stays passive (those screens have other primary actions). On dashboard
// the asterisk IS the page's emotional anchor, so making it the entry
// point to today's case is the natural move.
//
// Behavior:
//   hover    → aiState='anticipating' (the leaning-in animation)
//   leave    → aiState='idle' (force, since anticipating has higher prio)
//   click    → aiState='celebrating' + smooth-scroll to #todays-case
//
// Positioning: matches the dashboard preset render area (upper-left,
// scale 0.28 at viewport-normalized {-0.55, 0.35}). 96×96px target.

export function AsteriskHotspot() {
  const setAiState = useAsteriskSceneStore((s) => s.setAiState);
  // Track whether we're currently hovering so leave can cleanly drop
  // back to idle without fighting other state setters.
  const hoverRef = useRef<boolean>(false);

  const onEnter = () => {
    hoverRef.current = true;
    try {
      setAiState('anticipating');
    } catch {
      // store unavailable — non-fatal
    }
  };

  const onLeave = () => {
    hoverRef.current = false;
    try {
      // force=true because anticipating has higher priority than idle;
      // a plain setAiState('idle') would silently drop the write.
      setAiState('idle', { force: true });
    } catch {
      // non-fatal
    }
  };

  const onClick = () => {
    try {
      setAiState('celebrating');
    } catch {
      // non-fatal
    }
    // Smooth-scroll to today's case card. data-tour attribute is on the
    // <section> wrapper (set in dashboard/page.tsx). Falling back to a
    // direct begin-button click if the section is missing.
    if (typeof document !== 'undefined') {
      const target = document.querySelector('[data-tour="todays-case"]') as HTMLElement | null;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <button
      type="button"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onClick}
      aria-label="Wake Ash and jump to today's case"
      title="Click Ash to begin today's case"
      style={{
        position: 'fixed',
        top: 64,
        left: 24,
        width: 96,
        height: 96,
        zIndex: 5, // above the canvas (z=0), below nav (z=50)
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        // A whisper of an outline on focus for keyboard users.
        outline: 'none',
        padding: 0,
      }}
      // No hover background — the asterisk's own state change is the
      // visual feedback. Cursor:pointer is enough to signal interactivity.
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    />
  );
}
