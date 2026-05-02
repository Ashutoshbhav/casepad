'use client';

import { useEffect, useRef } from 'react';

// Auth watchdog — intercepts every fetch() call from the browser and detects
// when an /api route returns 401 mid-session (Supabase JWT expired). Instead
// of letting the page silently break or showing a confusing error in the
// chat panel, we surface a soft toast and bounce to /auth/signin so the
// user can re-link, with the original URL captured for return-to navigation.
//
// Mounted once in the root layout. Idempotent — only patches fetch once
// per page lifecycle.

declare global {
  interface Window {
    __casepadAuthPatched?: boolean;
  }
}

export function AuthWatchdog() {
  const toastRef = useRef<HTMLDivElement | null>(null);
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.__casepadAuthPatched) return;
    window.__casepadAuthPatched = true;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await originalFetch(...args);
      // Only act on same-origin /api/* responses to avoid false-positives
      // from Tavily / Supabase REST etc which use different auth shapes.
      try {
        const url = typeof args[0] === 'string'
          ? args[0]
          : args[0] instanceof URL
            ? args[0].toString()
            : (args[0] as Request).url;
        const isInternalApi =
          url.startsWith('/api/') ||
          url.startsWith(window.location.origin + '/api/');
        if (isInternalApi && res.status === 401 && !triggeredRef.current) {
          triggeredRef.current = true;
          handleExpired();
        }
      } catch {
        // Ignore — don't break fetch on URL parse errors.
      }
      return res;
    };

    return () => {
      // Don't unpatch — leave it for the lifetime of the SPA.
    };
  }, []);

  const handleExpired = () => {
    // Show toast for 2.5s, then redirect.
    const t = document.createElement('div');
    t.style.cssText =
      'position:fixed;top:1rem;left:50%;transform:translateX(-50%);z-index:9999;' +
      'background:#1e1b4b;border:1px solid #6366f1;color:#e0e7ff;' +
      'padding:0.6rem 1rem;border-radius:0.5rem;font-size:0.85rem;' +
      'box-shadow:0 10px 25px rgba(0,0,0,0.5);font-family:system-ui;';
    t.innerHTML =
      '🔑 Session expired — redirecting to sign-in to refresh…';
    document.body.appendChild(t);
    toastRef.current = t;

    const returnTo = window.location.pathname + window.location.search;
    setTimeout(() => {
      const url = '/auth/signin?return_to=' + encodeURIComponent(returnTo);
      window.location.href = url;
    }, 2500);
  };

  return null;
}
