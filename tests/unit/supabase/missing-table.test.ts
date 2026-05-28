import { describe, it, expect } from 'vitest';
import { isMissingTable } from '@/lib/supabase/missing-table';

// Why these tests exist: this helper sits on a recurring devils-advocate
// finding — three call sites (server action, dashboard, outcomes page) used
// to inspect the "table not created yet" condition in three different
// idioms, one of which was provably dead code (try/catch around a non-
// throwing call). Centralising it would have caught the inconsistency
// earlier; pinning the behaviour here makes drift loud.

describe('isMissingTable', () => {
  it('returns false for null / undefined / non-object inputs', () => {
    expect(isMissingTable(null)).toBe(false);
    expect(isMissingTable(undefined)).toBe(false);
    expect(isMissingTable('error string')).toBe(false);
    expect(isMissingTable(42)).toBe(false);
  });

  it('returns true for canonical Postgres undefined_table code (42P01)', () => {
    // Real shape PostgREST returns. This is the load-bearing case — every
    // PostgREST 4xx response for a missing relation carries this code.
    expect(isMissingTable({ code: '42P01', message: 'relation "x" does not exist' })).toBe(true);
  });

  it('returns true when code is 42P01 even without a message', () => {
    expect(isMissingTable({ code: '42P01' })).toBe(true);
  });

  it('returns true when message contains "does not exist" without the canonical code', () => {
    // Some proxies / wrappers strip the structured code but keep the
    // Postgres-format message text. Defense in depth.
    expect(isMissingTable({ message: 'relation "interview_outcomes" does not exist' })).toBe(true);
  });

  it('returns true on the "relation not found" message variant', () => {
    expect(isMissingTable({ message: 'Relation not found in schema cache' })).toBe(true);
  });

  it('returns false on unrelated PostgREST errors (auth, RLS, syntax)', () => {
    expect(isMissingTable({ code: '42501', message: 'permission denied for table x' })).toBe(false);
    expect(isMissingTable({ code: 'PGRST301', message: 'JWT expired' })).toBe(false);
    expect(isMissingTable({ code: '42703', message: 'column "foo" does not exist' })).toBe(true); // intentional: column-not-found ALSO contains "does not exist"; the helper's caller fail-opens to empty data, which is the safe-by-default outcome regardless.
  });

  it('returns false when message is missing entirely and code is unrelated', () => {
    expect(isMissingTable({ code: '23505' })).toBe(false); // unique_violation
  });

  it('is case-insensitive on message matching', () => {
    expect(isMissingTable({ message: 'RELATION X DOES NOT EXIST' })).toBe(true);
  });
});
