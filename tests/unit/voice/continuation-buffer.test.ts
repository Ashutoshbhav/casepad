import { describe, it, expect } from 'vitest';
import {
  initialContinuationState,
  combine,
  defer,
  atCap,
  MAX_CONTINUATIONS,
} from '@/lib/voice/continuation-buffer';

describe('continuation-buffer', () => {
  it('combine with an empty buffer returns just the new text, trimmed', () => {
    expect(combine(initialContinuationState, '  I think we should  ')).toBe('I think we should');
  });

  it('combine joins buffered text with the new fragment', () => {
    const s = defer(initialContinuationState, 'I think we should', false);
    expect(combine(s, 'look at the profitability lever.')).toBe(
      'I think we should look at the profitability lever.'
    );
  });

  it('defer increments count and stores the combined text', () => {
    const s = defer(initialContinuationState, 'I think we should', false);
    expect(s).toEqual({ text: 'I think we should', count: 1, lowConfidence: false });
  });

  it('defer OR-accumulates lowConfidence across chunks', () => {
    const s1 = defer(initialContinuationState, 'a', true);
    const s2 = defer(s1, 'a b', false);
    expect(s2.lowConfidence).toBe(true);
  });

  it('atCap is false below MAX_CONTINUATIONS and true at/above it', () => {
    let s = initialContinuationState;
    for (let i = 0; i < MAX_CONTINUATIONS; i++) {
      expect(atCap(s)).toBe(false);
      s = defer(s, `chunk ${i}`, false);
    }
    expect(atCap(s)).toBe(true);
  });

  it('initial state is never at cap', () => {
    expect(atCap(initialContinuationState)).toBe(false);
  });
});
