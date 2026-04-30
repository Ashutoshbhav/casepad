import { describe, it, expect, vi } from 'vitest';
import { Throttle } from '../../../scripts/ingest/throttle';

describe('Throttle', () => {
  it('allows up to N calls per window without delay', async () => {
    vi.useFakeTimers();
    const t = new Throttle(3, 1000);
    const start = Date.now();
    await t.acquire();
    await t.acquire();
    await t.acquire();
    expect(Date.now() - start).toBeLessThan(50);
    vi.useRealTimers();
  });

  it('delays the (N+1)-th call until the window slides', async () => {
    vi.useFakeTimers();
    const t = new Throttle(2, 1000);
    await t.acquire();
    await t.acquire();
    const p = t.acquire();
    vi.advanceTimersByTime(999);
    let resolved = false;
    p.then(() => { resolved = true; });
    await Promise.resolve();
    expect(resolved).toBe(false);
    vi.advanceTimersByTime(2);
    await p;
    vi.useRealTimers();
  });
});
