import { describe, it, expect } from 'vitest';
import {
  retrievePlaybookFindings,
  formatFindingsForPrompt,
} from '@/lib/groq/playbook-retriever';

describe('retrievePlaybookFindings', () => {
  it('returns empty for empty query (fail-open)', () => {
    expect(retrievePlaybookFindings('')).toEqual([]);
    expect(retrievePlaybookFindings('   ')).toEqual([]);
  });

  it('returns empty for query with only stopwords', () => {
    // All stopwords filter out — keyword set will be empty
    expect(retrievePlaybookFindings('the and a or but')).toEqual([]);
  });

  it('returns relevant findings for "hypothesis" queries', () => {
    const out = retrievePlaybookFindings('what is your hypothesis about revenue', 3);
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(3);
    // At least one finding should mention hypothesis
    const allText = out.map((f) => f.text.toLowerCase()).join(' ');
    expect(allText).toMatch(/hypothesis|revenue/);
  });

  it('returns relevant findings for "MECE structure" queries', () => {
    const out = retrievePlaybookFindings('is my structure MECE — revenue and costs', 3);
    expect(out.length).toBeGreaterThan(0);
    const allText = out.map((f) => f.text.toLowerCase()).join(' ');
    expect(allText).toMatch(/structure|mece|bucket|revenue|cost/i);
  });

  it('returns no more than k findings', () => {
    const out5 = retrievePlaybookFindings('revenue cost structure hypothesis market', 5);
    expect(out5.length).toBeLessThanOrEqual(5);
    const out2 = retrievePlaybookFindings('revenue cost structure hypothesis market', 2);
    expect(out2.length).toBeLessThanOrEqual(2);
  });

  it('returns findings with monotonically non-increasing scores', () => {
    const out = retrievePlaybookFindings('hypothesis structure framework MECE', 5);
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].score).toBeGreaterThanOrEqual(out[i].score);
    }
  });

  it('every returned finding has required shape', () => {
    const out = retrievePlaybookFindings('synthesis recommendation CEO', 3);
    for (const f of out) {
      expect(typeof f.text).toBe('string');
      expect(typeof f.section).toBe('string');
      expect(typeof f.id).toBe('string');
      expect(typeof f.score).toBe('number');
      expect(f.score).toBeGreaterThan(0);
    }
  });

  it('handles unicode / non-ASCII queries gracefully', () => {
    const out = retrievePlaybookFindings('café résumé naïve', 3);
    // Should not throw; may return 0 findings (these aren't in the playbook)
    expect(Array.isArray(out)).toBe(true);
  });

  it('handles very long queries', () => {
    const long = Array.from({ length: 500 }, () => 'word').join(' ');
    expect(() => retrievePlaybookFindings(long, 3)).not.toThrow();
  });
});

describe('formatFindingsForPrompt', () => {
  it('returns empty string when no findings', () => {
    expect(formatFindingsForPrompt([])).toBe('');
  });

  it('formats findings as a system-prompt block', () => {
    const block = formatFindingsForPrompt([
      { text: 'Push back on memorized frameworks.', section: '15.2', id: '01#5', score: 0.9 },
      { text: 'Demand a hypothesis before structure.', section: '5.2', id: '02#3', score: 0.8 },
    ]);
    expect(block).toContain('RELEVANT INTERVIEWER PRACTICE');
    expect(block).toContain('Push back on memorized frameworks');
    expect(block).toContain('15.2');
    expect(block).toContain('Demand a hypothesis');
  });

  it('strips markdown bold/links from finding text', () => {
    const block = formatFindingsForPrompt([
      {
        text: '**Push back** on weak structure. [source](https://x.com)',
        section: '3.1',
        id: '01#1',
        score: 1.0,
      },
    ]);
    expect(block).not.toContain('**');
    expect(block).not.toContain('](');
    expect(block).toContain('Push back on weak structure');
  });

  it('truncates very long findings to 280 chars', () => {
    const longText = 'a'.repeat(500);
    const block = formatFindingsForPrompt([
      { text: longText, section: 'x', id: 'y', score: 1.0 },
    ]);
    // Block contains "1. [x] " prefix + at most 280 chars of content
    const contentLine = block.split('\n').find((l) => l.startsWith('1.'));
    expect(contentLine?.length).toBeLessThan(310); // prefix + 280
  });
});
