import { describe, it, expect } from 'vitest';
import {
  INDIA_ANCHORS,
  INDIA_ANCHOR_COUNT,
  anchorsByGroup,
  renderIndiaReferenceBlock,
  type AnchorGroup,
} from '@/lib/india-reference';

describe('india-reference dataset integrity', () => {
  it('has anchors', () => {
    expect(INDIA_ANCHOR_COUNT).toBeGreaterThan(40);
    expect(INDIA_ANCHORS.length).toBe(INDIA_ANCHOR_COUNT);
  });

  it('every anchor has full provenance (no unsourced numbers)', () => {
    for (const a of INDIA_ANCHORS) {
      expect(a.key, `key on ${a.label}`).toBeTruthy();
      expect(a.label).toBeTruthy();
      expect(a.value).toBeTruthy();
      expect(a.asOf, `asOf on ${a.key}`).toBeTruthy();
      expect(a.sourceName, `sourceName on ${a.key}`).toBeTruthy();
      expect(a.sourceUrl, `sourceUrl on ${a.key}`).toMatch(/^https?:\/\//);
      expect(['verified', 'estimate']).toContain(a.confidence);
      expect(['macro', 'income', 'digital', 'sector']).toContain(a.group);
    }
  });

  it('keys are unique', () => {
    const keys = INDIA_ANCHORS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('does NOT contain NCCS or tier-spend split anchors (deliberately unsourced)', () => {
    const blob = JSON.stringify(INDIA_ANCHORS).toLowerCase();
    expect(blob).not.toContain('nccs');
    // no anchor key for a tier-wise consumer-spend split
    expect(INDIA_ANCHORS.some((a) => /tier.*spend|spend.*split/.test(a.key))).toBe(false);
  });
});

describe('anchorsByGroup', () => {
  it('partitions the dataset', () => {
    const groups: AnchorGroup[] = ['macro', 'income', 'digital', 'sector'];
    const total = groups.reduce((n, g) => n + anchorsByGroup(g).length, 0);
    expect(total).toBe(INDIA_ANCHOR_COUNT);
  });
});

describe('renderIndiaReferenceBlock', () => {
  it('renders all groups by default', () => {
    const out = renderIndiaReferenceBlock();
    expect(out).toContain('INDIA NUMBER BANK');
    expect(out).toContain('MACRO & DEMOGRAPHICS');
    expect(out).toContain('SECTOR MARKET SIZES');
    expect(out).toContain('[V]');
  });

  it('filters to requested groups', () => {
    const out = renderIndiaReferenceBlock(['sector']);
    expect(out).toContain('SECTOR MARKET SIZES');
    expect(out).not.toContain('MACRO & DEMOGRAPHICS');
  });

  it('is total — bad input never throws', () => {
    // @ts-expect-error — exercising garbage input
    expect(() => renderIndiaReferenceBlock(['nonsense'])).not.toThrow();
    // a garbage-only filter yields '' (nothing renderable) rather than crashing
    // @ts-expect-error
    expect(renderIndiaReferenceBlock(['nonsense'])).toBe('');
    // an empty array is treated as "no filter" → full set
    expect(() => renderIndiaReferenceBlock([])).not.toThrow();
    expect(renderIndiaReferenceBlock([])).toContain('MACRO & DEMOGRAPHICS');
  });
});
