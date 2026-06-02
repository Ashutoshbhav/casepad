import { describe, it, expect } from 'vitest';
import { PLAYBOOKS, CROSS_CUTTING, renderPlaybook } from '@/lib/groq/ideal-answer-playbooks';

describe('ideal-answer playbooks', () => {
  it('renders a full playbook block for a known case type', () => {
    const out = renderPlaybook('profitability');
    expect(out).toContain('TOP-CANDIDATE PLAYBOOK');
    expect(out).toContain('FRAMEWORK:');
    expect(out).toContain('ANATOMY OF A TOP ANSWER');
    expect(out).toContain('SPIKE MOVES');
    expect(out).toContain('AVOID');
    expect(out).toContain('SELF-CHECK');
    // cross-cutting (L0-L4 + anti-slop) is always appended
    expect(out).toContain('L0');
    expect(out).toContain('ANTI-SLOP');
  });

  it('falls back to cross-cutting only for an unknown case type', () => {
    const out = renderPlaybook('totally_unknown_type');
    expect(out).toContain('TOP-CANDIDATE STANDARD');
    expect(out).toContain(CROSS_CUTTING);
    expect(out).not.toContain('TOP-CANDIDATE PLAYBOOK for');
  });

  it('every playbook has non-empty framework + all four lists', () => {
    for (const [key, p] of Object.entries(PLAYBOOKS)) {
      expect(p.framework.length, `${key} framework`).toBeGreaterThan(20);
      expect(p.anatomy.length, `${key} anatomy`).toBeGreaterThanOrEqual(4);
      expect(p.spikeMoves.length, `${key} spikeMoves`).toBeGreaterThanOrEqual(2);
      expect(p.commonMistakes.length, `${key} commonMistakes`).toBeGreaterThanOrEqual(3);
      expect(p.checklist.length, `${key} checklist`).toBeGreaterThanOrEqual(5);
    }
  });

  it('covers the core case types the generator anchors on', () => {
    for (const t of ['profitability', 'market_entry', 'pricing', 'mna', 'operations', 'estimation', 'growth_metrics', 'product_design', 'behavioral']) {
      expect(PLAYBOOKS[t], `missing playbook: ${t}`).toBeTruthy();
    }
  });
});
