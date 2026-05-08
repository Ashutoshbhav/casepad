import { describe, it, expect } from 'vitest';
import { staticChatTurnFallback, staticEvaluatorBreakdown } from '@/lib/groq/static-fallbacks';

describe('staticChatTurnFallback', () => {
  it('returns a structure-prompt for early turns (0-1) [intent-matched]', () => {
    // 3 rotation variants — all match intent: structure / framework / lay out
    expect(staticChatTurnFallback(0)).toMatch(/structure|framework|lay out|talk me/i);
    expect(staticChatTurnFallback(1)).toMatch(/structure|framework|lay out|talk me/i);
  });

  it('returns a hypothesis-prompt for mid-early turns (2-3) [intent-matched]', () => {
    expect(staticChatTurnFallback(2)).toMatch(/hypothesis|broken|gut|issue/i);
    expect(staticChatTurnFallback(3)).toMatch(/hypothesis|broken|gut|issue/i);
  });

  it('returns a digging-prompt for mid turns (4-6) [intent-matched]', () => {
    expect(staticChatTurnFallback(4)).toMatch(/dig|number|branch|data|change your mind/i);
    expect(staticChatTurnFallback(6)).toMatch(/dig|number|branch|data|change your mind/i);
  });

  it('returns a synthesis-prompt for late turns (7-10) [intent-matched]', () => {
    expect(staticChatTurnFallback(7)).toMatch(/CEO|wrap|bottom line|synthesi|client/i);
    expect(staticChatTurnFallback(10)).toMatch(/CEO|wrap|bottom line|synthesi|client/i);
  });

  it('returns a final-test prompt for very late turns (11+) [intent-matched]', () => {
    expect(staticChatTurnFallback(11)).toMatch(/recommendation|number|defend|bet/i);
    expect(staticChatTurnFallback(20)).toMatch(/recommendation|number|defend|bet/i);
  });

  it('rotates through different variants on consecutive turns in same range', () => {
    // Same bucket, different turn counts → different variants (anti-repeat)
    const variants = new Set([
      staticChatTurnFallback(11),
      staticChatTurnFallback(12),
      staticChatTurnFallback(13),
    ]);
    expect(variants.size).toBeGreaterThan(1); // at least 2 distinct variants
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
