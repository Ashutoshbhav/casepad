'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function CaseSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const urlQ = params.get('q') ?? '';

  const [value, setValue] = useState(urlQ);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushedRef = useRef(urlQ);

  // Sync local input when URL changes from outside (e.g., type-card click clears q).
  useEffect(() => {
    if (urlQ !== lastPushedRef.current) {
      setValue(urlQ);
      lastPushedRef.current = urlQ;
    }
  }, [urlQ]);

  const pushQuery = (next: string) => {
    const sp = new URLSearchParams(params.toString());
    const trimmed = next.trim();
    if (trimmed) sp.set('q', trimmed);
    else sp.delete('q');
    lastPushedRef.current = trimmed;
    const qs = sp.toString();
    startTransition(() => {
      router.push(qs ? `/cases?${qs}#library` : '/cases#library', { scroll: false });
    });
  };

  const onChange = (next: string) => {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushQuery(next), 300);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushQuery(value);
  };

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className="mb-6"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        border: '1px solid var(--color-border)',
        padding: '10px 14px',
        background: 'var(--color-bg-canvas)',
      }}
    >
      <span
        aria-hidden
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-text-muted)',
        }}
      >
        Search
      </span>
      <label htmlFor="case-search-input" className="sr-only">
        Search cases by title
      </label>
      <input
        id="case-search-input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by title — e.g. Book on China, Coffee Shop, FMCG margin…"
        autoComplete="off"
        aria-label="Search cases by title"
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          color: 'var(--color-text-primary)',
          padding: '4px 0',
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue('');
            if (debounceRef.current) clearTimeout(debounceRef.current);
            pushQuery('');
          }}
          aria-label="Clear search"
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            padding: '4px 10px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Clear ×
        </button>
      )}
    </form>
  );
}
