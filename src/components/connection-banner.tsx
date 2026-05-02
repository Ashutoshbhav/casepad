'use client';

import { useEffect, useState } from 'react';

// Sticky banner that appears when the browser is offline. We listen to
// window online/offline events — that's the most reliable signal. Supabase
// realtime status is per-channel and not globally accessible without a
// subscribed client, so we keep this dumb and pure.
export function ConnectionBanner() {
  const [online, setOnline] = useState(true);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Initial state — navigator.onLine is only meaningful client-side.
    setOnline(navigator.onLine);
    if (!navigator.onLine) setShow(true);

    const goOnline = () => {
      setOnline(true);
      // Briefly show "reconnected" then hide.
      window.setTimeout(() => setShow(false), 1500);
    };
    const goOffline = () => {
      setOnline(false);
      setShow(true);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-xs sm:text-sm font-medium transition-colors ${
        online
          ? 'bg-emerald-700 text-white'
          : 'bg-amber-900/90 text-amber-100 border-b border-amber-700'
      }`}
    >
      {online ? 'Reconnected' : 'Connection lost — retrying…'}
    </div>
  );
}
