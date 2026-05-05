'use client';

import { useEffect, useState } from 'react';

// Theme toggle — fixed top-right, sun/moon icon. Persists choice in
// localStorage and flips `<html data-theme="…">`. The pre-paint script
// in app/layout.tsx already sets the right attribute before React
// mounts (no flash), so this component just hydrates with the current
// state and handles user clicks.

type Theme = 'dark' | 'light';

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return (document.documentElement.getAttribute('data-theme') as Theme) || 'dark';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTheme(readTheme());
    setHydrated(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('casepad-theme', next); } catch {}
  };

  // Render a placeholder during SSR / pre-hydration so the layout is
  // stable. After hydration we know the actual theme and render the
  // correct icon.
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 60,
        width: 36,
        height: 36,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        background: 'var(--color-bg-elevated)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border)',
        cursor: 'pointer',
        transition: 'background-color 180ms ease, color 180ms ease',
        opacity: hydrated ? 1 : 0,
      }}
    >
      {isLight ? (
        // Moon icon — clicking switches to dark
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // Sun icon — clicking switches to light
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
    </button>
  );
}
