import { describe, it, expect } from 'vitest';
import { staticChatTurnFallback, staticEvaluatorBreakdown } from '@/lib/groq/static-fallbacks';

describe('staticChatTurnFallback', () => {
  it('returns a structure-prompt for early turns (0-1)', () => {
    expect(staticChatTurnFallback(0)).toMatch(/structure/i);
    expect(staticChatTurnFallback(1)).toMatch(/structure/i);
  });

  it('returns a hypothesis-prompt for mid-early turns (2-3)', () => {
    expect(staticChatTurnFallback(2)).toMatch(/hypothesis/i);
    expect(staticChatTurnFallback(3)).toMatch(/hypothesis/i);
  });

  it('returns a digging-prompt for mid turns (4-6)', () => {
    expect(staticChatTurnFallback(4)).toMatch(/dig|number|right/i);
    expect(staticChatTurnFallback(6)).toMatch(/dig|number|right/i);
  });

  it('returns a synthesis-prompt for late turns (7-10)', () => {
    expect(staticChatTurnFallback(7)).toMatch(/CEO|30 seconds|synthesi/i);
    expect(staticChatTurnFallback(10)).toMatch(/CEO|30 seconds|synthesi/i);
  });

  it('returns a final-test prompt for very late turns (11+)', () => {
    expect(staticChatTurnFallback(11)).toMatch(/recommendation|number/i);
    expect(staticChatTurnFallback(20)).toMatch(/recommendation|number/i);
  });

  it('always returns non-empty plain-prose (no markdown, no error tokens)', () => {
    for (let i = 0; i < 25; i++) {
      const out = staticChatTurnFallback(i);
      expect(out.length).toBeGreaterThan(20);
      expect(out).not.toMatch(/Service is busy|error|undefined|null|\[/i);
      expect(out).not.toMatch(/^[*#`]/); // no markdown-leading chars
    }
  });

  it('ends with a probe (question or directive) — never trails off', () => {
    for (let i = 0; i < 25; i++) {
      const out = staticChatTurnFallback(i);
      // Must end with ? or . — probe semantics. No "..." or trailing comma.
      expect(out).toMatch(/[.?]$/);
      expect(out).not.toMatch(/[,…]$/);
    }
  });
});

describe('staticEvaluatorBreakdown', () => {
  it('returns a valid 50/100 fallback shape with fallback_used flag', () => {
    const out = staticEvaluatorBreakdown(null);
    expect(out.total).toBe(50);
    expect(out.fallback_used).toBe(true);
    expect(Array.isArray(out.strengths)).toBe(true);
    expect(Array.isArray(out.gaps)).toBe(true);
  });
});
