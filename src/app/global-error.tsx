'use client';

import { useEffect } from 'react';

// Root-of-root catch-all. Bypasses RootLayout, so globals.css and next/font
// CSS variables don't load — every style stays inline. HUPR mono palette:
// white canvas, #323234 ink, hairline borders, no rounded corners, no italic,
// system mono headline.
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
          background: '#FFFFFF',
          color: '#323234',
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily:
            "ui-monospace, 'IBM Plex Mono', 'SF Mono', Menlo, Monaco, Consolas, monospace",
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 480,
            padding: 32,
            border: '1px solid #e8e8e8',
            background: '#FFFFFF',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#323234',
              marginBottom: 4,
            }}
          >
            CasePad · Error
          </div>
          <hr
            style={{
              border: 0,
              borderTop: '1px solid #e8e8e8',
              margin: '8px 0 20px',
            }}
          />
          <h1
            style={{
              fontFamily:
                "'Montserrat', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: 32,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '-0.005em',
              lineHeight: 1.05,
              margin: 0,
              color: '#323234',
            }}
          >
            Something didn&rsquo;t load
          </h1>
          <p
            style={{
              fontSize: 13,
              color: 'rgba(50, 50, 52, 0.72)',
              marginTop: 16,
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
                color: 'rgba(50, 50, 52, 0.50)',
                marginTop: 16,
                marginBottom: 0,
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
                background: '#f4f4f4',
                border: '1px solid #e8e8e8',
                fontSize: 11,
                color: 'rgba(50, 50, 52, 0.72)',
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
              marginTop: 28,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <button
              onClick={() => reset()}
              style={{
                padding: '14px 22px',
                fontSize: 13,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                background: '#323234',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/cases"
              style={{
                padding: '14px 22px',
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#323234',
                background: 'transparent',
                border: '1px solid #323234',
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
