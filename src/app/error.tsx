'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// Route-level error boundary. Lives in the redesigned palette: deep canvas
// background, elevated card, Instrument Serif headline, coral CTA. Voice
// stays quiet — "didn't load" reads less alarmist than "went wrong" while
// preserving honesty.

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Verbose log so we can see the full error shape in console regardless
    // of what the boundary surfaced.
    console.error('[casepad/error.tsx]', error);
    console.error('[casepad/error.tsx] error.name:', error?.name);
    console.error('[casepad/error.tsx] error.message:', error?.message);
    console.error('[casepad/error.tsx] error.digest:', error?.digest);
    console.error('[casepad/error.tsx] error.stack:', error?.stack);
    console.error('[casepad/error.tsx] error.cause:', (error as { cause?: unknown })?.cause);
    console.error('[casepad/error.tsx] error keys:', Object.keys(error ?? {}));
    console.error('[casepad/error.tsx] error toString:', String(error));
  }, [error]);

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--color-bg-canvas)' }}
    >
      <div
        className="w-full max-w-md rounded-lg p-6 sm:p-8"
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h1
          className="font-headline italic text-2xl sm:text-3xl leading-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Something didn&rsquo;t load
        </h1>
        <p
          className="mt-3 text-sm leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          CasePad ran into a hiccup. Try again, or head back to your cases.
        </p>
        {/* Always-visible debug panel — even when digest + message are nullish
            we want to see error.name, toString output, and key list so we can
            identify the throw shape. Gated only by `error` existing at all. */}
        {error && (
          <pre
            style={{
              marginTop: 16,
              padding: 12,
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
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
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-md text-sm font-medium transition-opacity hover:opacity-90"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-accent-fg)',
            }}
          >
            Try again
          </button>
          <Link
            href="/cases"
            className="px-5 py-2.5 rounded-md text-sm transition-opacity hover:opacity-80"
            style={{
              background: 'transparent',
              border: '1px solid var(--color-accent)',
              color: 'var(--color-accent)',
            }}
          >
            Back to /cases
          </Link>
        </div>
      </div>
    </main>
  );
}
