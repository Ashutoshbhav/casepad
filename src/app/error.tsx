'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// Route-level error boundary in HUPR mono — Montserrat 700 uppercase title,
// hairline rectangles (no rounded corners), no italic.

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[casepad/error.tsx]', error);
  }, [error]);

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--color-bg-canvas)' }}
    >
      <div
        className="w-full max-w-md p-8"
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="hupr-mono-eyebrow"
          style={{ color: 'var(--color-text-primary)' }}
        >
          CasePad · Error
        </div>
        <hr className="hupr-hairline mb-5" />
        <h1
          className="uppercase"
          style={{
            fontFamily: 'var(--font-headline)',
            fontWeight: 700,
            fontSize: 32,
            lineHeight: 1.05,
            letterSpacing: '-0.005em',
            margin: 0,
            color: 'var(--color-text-primary)',
          }}
        >
          Something didn&rsquo;t load
        </h1>
        <p
          className="mt-4 text-sm leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          CasePad ran into a hiccup. Try again, or head back to your cases.
        </p>
        {error && (
          <pre
            style={{
              marginTop: 16,
              padding: 12,
              background: 'var(--color-bg-sunken)',
              border: '1px solid var(--color-border)',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-secondary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 220,
              overflow: 'auto',
            }}
          >
{`name:    ${error.name ?? 'none'}
message: ${error.message ?? '(empty)'}
digest:  ${error.digest ?? 'none'}
toStr:   ${String(error).slice(0, 200)}
keys:    ${Object.keys(error).join(', ') || '(none)'}
stack:
${error.stack?.split('\n').slice(0, 8).join('\n') ?? '(no stack)'}`}
          </pre>
        )}
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            onClick={() => reset()}
            className="hupr-anim-btn"
            style={{
              background: 'var(--color-text-primary)',
              color: 'var(--color-bg-canvas)',
              padding: '14px 22px',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-block',
            }}
          >
            Try again
          </button>
          <Link
            href="/cases"
            style={{
              padding: '14px 22px',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              background: 'transparent',
              border: '1px solid var(--color-text-primary)',
              color: 'var(--color-text-primary)',
              textDecoration: 'none',
            }}
          >
            Back to /cases
          </Link>
        </div>
      </div>
    </main>
  );
}
