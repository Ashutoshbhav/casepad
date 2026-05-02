'use client';

import { useEffect } from 'react';
import Link from 'next/link';

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
    <main className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
      <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8">
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-900/30 text-rose-300">
          !
        </div>
        <h1 className="text-lg font-semibold text-zinc-100">Something went wrong</h1>
        <p className="mt-2 text-sm text-zinc-400">
          We hit a hiccup loading this page. It might be a brief connection issue —
          try again in a second.
        </p>
        {error?.digest && (
          <p className="mt-2 text-xs text-zinc-600">ref: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => reset()}
            className="px-4 py-2 text-sm font-medium rounded bg-emerald-700 hover:bg-emerald-600 text-white transition"
          >
            Try again
          </button>
          <Link
            href="/cases"
            className="px-4 py-2 text-sm rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition"
          >
            Back to /cases
          </Link>
        </div>
      </div>
    </main>
  );
}
