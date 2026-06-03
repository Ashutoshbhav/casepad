import { describe, it, expect } from 'vitest';
import { decideBudget } from '@/lib/usage/llm-budget-core';

const CAPS = { global: 4000, user: 120 };

describe('decideBudget', () => {
  it('allows a call well under both caps', () => {
    const r = decideBudget(100, 5, CAPS);
    expect(r.allowed).toBe(true);
  });

  it('allows exactly AT each cap (only > trips it)', () => {
    expect(decideBudget(4000, 120, CAPS).allowed).toBe(true);
  });

  it('blocks on the global cap first (protects the whole app)', () => {
    const r = decideBudget(4001, 5, CAPS);
    expect(r.allowed).toBe(false);
    expect(r.scope).toBe('global');
  });

  it('blocks a single abused account on the per-user cap', () => {
    const r = decideBudget(200, 121, CAPS);
    expect(r.allowed).toBe(false);
    expect(r.scope).toBe('user');
  });

  it('global takes precedence when both are exceeded', () => {
    const r = decideBudget(5000, 999, CAPS);
    expect(r.allowed).toBe(false);
    expect(r.scope).toBe('global');
  });
});
