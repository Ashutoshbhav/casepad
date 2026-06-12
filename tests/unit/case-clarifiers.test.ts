import { describe, it, expect } from 'vitest';
import {
  clarifiersFor,
  renderClarifiers,
  UNIVERSAL_CLARIFIERS,
} from '@/lib/case-clarifiers';
import type { CaseType } from '@/lib/groq/walkthrough';

const ALL_TYPES: CaseType[] = [
  'profitability', 'market_entry', 'pricing', 'mna', 'operations',
  'estimation', 'growth_metrics', 'product_design', 'behavioral', 'unknown',
];

describe('case-clarifiers', () => {
  it('every case type has at least 2 well-formed clarifiers', () => {
    for (const t of ALL_TYPES) {
      const list = clarifiersFor(t);
      expect(list.length, `clarifiers for ${t}`).toBeGreaterThanOrEqual(2);
      for (const c of list) {
        expect(c.q).toBeTruthy();
        expect(c.why).toBeTruthy();
      }
    }
  });

  it('falls back to the universal set for an unknown type', () => {
    // @ts-expect-error — exercising an out-of-enum value
    expect(clarifiersFor('bogus')).toBe(UNIVERSAL_CLARIFIERS);
    expect(clarifiersFor('unknown')).toBe(UNIVERSAL_CLARIFIERS);
  });

  it('estimation clarifiers cover time frame, geography, and metric', () => {
    const blob = JSON.stringify(clarifiersFor('estimation')).toLowerCase();
    expect(blob).toContain('time frame');
    expect(blob).toContain('geography');
    expect(blob).toContain('metric');
  });

  it('renderClarifiers is total and labels the section', () => {
    expect(() => renderClarifiers('profitability')).not.toThrow();
    const out = renderClarifiers('profitability');
    expect(out).toContain('CLARIFY-FIRST QUESTIONS');
    expect(out).toContain('profit');
  });
});
