'use client';

import { useState } from 'react';
import type { TreatmentTokens } from '../_lib/tokens';

// localStorage-only pick recorder. No API, no DB. Click writes the choice;
// CurrentPickBadge reads it on mount.
export function PickButton({ tokens }: { tokens: TreatmentTokens }) {
  const [picked, setPicked] = useState(false);

  function handlePick() {
    try {
      window.localStorage.setItem('design_choice', tokens.id);
      window.localStorage.setItem(
        'design_choice_at',
        new Date().toISOString(),
      );
    } catch {
      // localStorage may be unavailable (private mode, quota). Silent.
    }
    setPicked(true);
    window.dispatchEvent(new CustomEvent('design-choice:changed'));
  }

  return (
    <button
      type="button"
      onClick={handlePick}
      style={{
        background: picked ? tokens.elevated : tokens.accent,
        color: picked ? tokens.accent : tokens.accentInk,
        border: `1px solid ${tokens.accent}`,
        borderRadius: '4px',
        padding: '14px 28px',
        fontFamily: tokens.fontBody,
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background 160ms ease, color 160ms ease, transform 160ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {picked ? `Picked - ${tokens.name}` : 'I pick this -->'}
    </button>
  );
}
