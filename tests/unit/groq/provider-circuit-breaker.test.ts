import { describe, it, expect } from 'vitest';
import {
  initialCircuitState,
  isOpen,
  onSuccess,
  onFailure,
  FAILURE_THRESHOLD,
  COOLDOWN_MS,
} from '@/lib/provider-circuit-breaker';

describe('provider-circuit-breaker', () => {
  it('starts closed', () => {
    expect(isOpen(initialCircuitState, 0)).toBe(false);
  });

  it('stays closed below the failure threshold', () => {
    let s = initialCircuitState;
    for (let i = 0; i < FAILURE_THRESHOLD - 1; i++) {
      s = onFailure(s, i * 1000);
    }
    expect(isOpen(s, 999_999)).toBe(false);
  });

  it('opens exactly at the failure threshold', () => {
    let s = initialCircuitState;
    let lastFailureAt = 0;
    for (let i = 0; i < FAILURE_THRESHOLD; i++) {
      lastFailureAt = i * 1000;
      s = onFailure(s, lastFailureAt);
    }
    expect(isOpen(s, lastFailureAt)).toBe(true);
  });

  it('closes again once the cooldown elapses', () => {
    let s = initialCircuitState;
    for (let i = 0; i < FAILURE_THRESHOLD; i++) {
      s = onFailure(s, 0);
    }
    expect(isOpen(s, COOLDOWN_MS - 1)).toBe(true);
    expect(isOpen(s, COOLDOWN_MS)).toBe(false);
  });

  it('a single success fully resets the circuit, not a gradual decay', () => {
    let s = initialCircuitState;
    for (let i = 0; i < FAILURE_THRESHOLD; i++) {
      s = onFailure(s, 0);
    }
    expect(isOpen(s, 0)).toBe(true);
    s = onSuccess();
    expect(isOpen(s, 0)).toBe(false);
    expect(s).toEqual(initialCircuitState);
  });

  it('supports custom threshold/cooldown overrides', () => {
    let s = initialCircuitState;
    s = onFailure(s, 0, 1, 5000); // trips on the very first failure
    expect(isOpen(s, 4999)).toBe(true);
    expect(isOpen(s, 5000)).toBe(false);
  });

  it('failure count keeps climbing while already open (does not reset mid-outage)', () => {
    let s = initialCircuitState;
    for (let i = 0; i < FAILURE_THRESHOLD + 2; i++) {
      s = onFailure(s, 0);
    }
    expect(s.consecutiveFailures).toBe(FAILURE_THRESHOLD + 2);
  });
});
