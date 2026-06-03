import { describe, it, expect } from 'vitest';
import { checkRateLimit, rateLimit } from '@/lib/rate-limit';

describe('checkRateLimit (in-memory)', () => {
  it('allows up to max within the window, then blocks', () => {
    const key = `test:${Math.random()}`;
    expect(checkRateLimit(key, 2, 60_000).ok).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).ok).toBe(true);
    const blocked = checkRateLimit(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});

describe('rateLimit (async) — falls back to in-memory when Upstash is not configured', () => {
  it('delegates to the in-memory limiter (no UPSTASH env in tests)', async () => {
    const key = `test-async:${Math.random()}`;
    expect((await rateLimit(key, 2, 60_000)).ok).toBe(true);
    expect((await rateLimit(key, 2, 60_000)).ok).toBe(true);
    expect((await rateLimit(key, 2, 60_000)).ok).toBe(false);
  });
});
