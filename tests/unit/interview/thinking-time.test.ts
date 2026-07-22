import { describe, it, expect } from 'vitest';
import { isThinkingTimeRequest } from '@/lib/interview/thinking-time';

describe('isThinkingTimeRequest', () => {
  it('detects common phrasings', () => {
    expect(isThinkingTimeRequest('Give me a moment to think about this.')).toBe(true);
    expect(isThinkingTimeRequest('Can you give me a second?')).toBe(true);
    expect(isThinkingTimeRequest('Let me think through this for a second.')).toBe(true);
    expect(isThinkingTimeRequest('I need a moment to structure my approach.')).toBe(true);
    expect(isThinkingTimeRequest('Just bear with me here.')).toBe(true);
    expect(isThinkingTimeRequest("I'm just thinking out loud right now.")).toBe(true);
    expect(isThinkingTimeRequest('Let me take a moment to organize my thoughts.')).toBe(true);
    expect(isThinkingTimeRequest('Take a beat, let me structure my thoughts.')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isThinkingTimeRequest('GIVE ME A MOMENT TO THINK')).toBe(true);
  });

  it('does not false-positive on normal case-solving turns', () => {
    expect(isThinkingTimeRequest('I would structure this into three buckets: revenue, cost, and market.')).toBe(false);
    expect(isThinkingTimeRequest("Let's start with the market sizing.")).toBe(false);
    expect(isThinkingTimeRequest('The revenue dropped because of increased churn.')).toBe(false);
    expect(isThinkingTimeRequest('What is the current market share?')).toBe(false);
  });

  it('handles empty/whitespace input safely', () => {
    expect(isThinkingTimeRequest('')).toBe(false);
    expect(isThinkingTimeRequest('   ')).toBe(false);
  });

  it('never throws on weird input', () => {
    expect(() => isThinkingTimeRequest('a'.repeat(100000))).not.toThrow();
    // @ts-expect-error deliberately testing non-string input for defensiveness
    expect(isThinkingTimeRequest(null)).toBe(false);
  });
});
