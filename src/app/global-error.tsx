'use client';

import { useEffect } from 'react';

// Root-level catch-all. Bypasses the root layout, so it must define its
// own <html>/<body>. Only triggers for errors *in* the root layout itself.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[casepad/global-error.tsx]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: '#09090b',
          color: '#fafafa',
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            padding: 24,
            border: '1px solid #27272a',
            borderRadius: 8,
            background: 'rgba(24,24,27,0.5)',
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: 14,
              color: '#a1a1aa',
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            CasePad ran into an unexpected error. Try again, or head back to your
            cases.
          </p>
          {error?.digest && (
            <p style={{ fontSize: 12, color: '#52525b', marginTop: 8 }}>
              ref: {error.digest}
            </p>
          )}
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button
              onClick={() => reset()}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 500,
                background: '#047857',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/cases"
              style={{
                padding: '8px 16px',
                fontSize: 14,
                color: '#d4d4d8',
                border: '1px solid #3f3f46',
                borderRadius: 4,
                textDecoration: 'none',
              }}
            >
              Back to /cases
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
