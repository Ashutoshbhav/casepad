'use client';

import { useEffect } from 'react';

// Root-level catch-all. Bypasses the root layout, so it must define its
// own <html>/<body>. Only triggers for errors *in* the root layout itself.
// Restyled 2026-05-04 to match the redesigned palette: deep canvas bg,
// elevated card, Instrument Serif headline, coral CTA. The inline-only
// styling is mandatory here — globals.css doesn't load at this layer.
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
          background: '#1a1817',
          color: '#faf9f5',
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          fontFamily:
            "'Geist', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            padding: 24,
            border: '1px solid #2f2c29',
            borderRadius: 8,
            background: '#252220',
          }}
        >
          <h1
            style={{
              fontSize: 28,
              fontWeight: 400,
              margin: 0,
              fontStyle: 'italic',
              fontFamily:
                "'Instrument Serif', ui-serif, Georgia, 'Times New Roman', serif",
              letterSpacing: '-0.015em',
              lineHeight: 1.15,
              color: '#faf9f5',
            }}
          >
            Something didn&rsquo;t load
          </h1>
          <p
            style={{
              fontSize: 14,
              color: '#b0aea5',
              marginTop: 12,
              marginBottom: 0,
              lineHeight: 1.55,
            }}
          >
            CasePad ran into a hiccup. Try again, or head back to your cases.
          </p>
          {error?.digest && (
            <p
              style={{
                fontSize: 10,
                color: '#7a7873',
                marginTop: 12,
                marginBottom: 0,
                fontFamily:
                  "'Geist Mono', ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace",
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
              }}
            >
              ref: {error.digest}
            </p>
          )}
          {(error?.digest || error?.message) && (
            <pre
              style={{
                marginTop: 16,
                padding: 12,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid #2f2c29',
                borderRadius: 4,
                fontSize: 11,
                fontFamily:
                  "'Geist Mono', ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace",
                color: '#b0aea5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: '16px 0 0 0',
              }}
            >
{`digest: ${error?.digest ?? 'none'}
message: ${error?.message ?? 'none'}
stack: ${error?.stack?.split('\n').slice(0, 6).join('\n') ?? 'none'}`}
            </pre>
          )}
          <div
            style={{
              marginTop: 24,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <button
              onClick={() => reset()}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                background: '#d97757',
                color: '#141413',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/cases"
              style={{
                padding: '10px 20px',
                fontSize: 14,
                color: '#d97757',
                background: 'transparent',
                border: '1px solid #d97757',
                borderRadius: 6,
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
