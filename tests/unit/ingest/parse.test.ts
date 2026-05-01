import { describe, it, expect } from 'vitest';
import {
  needsOcr,
  splitIntoCaseChunks,
  isLikelyWholeDocument,
  MAX_CASE_CHARS,
} from '../../../scripts/ingest/parse';
import { readFileSync } from 'fs';
import path from 'path';

const sample = readFileSync(
  path.join(__dirname, 'fixtures/sample-casebook-page.txt'),
  'utf8'
);

describe('needsOcr', () => {
  it('returns false for normal-density text', () => {
    expect(needsOcr(sample, 1)).toBe(false);
  });
  it('returns true when chars-per-page is very low', () => {
    expect(needsOcr('xx', 5)).toBe(true);
  });
});

describe('splitIntoCaseChunks', () => {
  it('splits on "Case N:" headers', () => {
    const chunks = splitIntoCaseChunks(sample);
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toContain('Cement plant entry');
    expect(chunks[1]).toContain('Profitability decline');
  });

  it('returns the whole text as one chunk if no headers found', () => {
    expect(splitIntoCaseChunks('no headers here').length).toBe(1);
  });

  // Each chunk must exceed the 50-char filter inside splitIntoCaseChunks, so
  // fixtures pad the body of each case past that threshold.
  const padBody = (n: number) => ` Body of case ${n}. Lorem ipsum dolor sit amet, padding for the 50-char filter floor.\n`;

  it('matches "Case Study N" / "Case No. N" / "Case #N" variants', () => {
    const text = `Case Study 1 — Market entry${padBody(1)}Case No. 2: Profitability${padBody(2)}Case #3 Operations${padBody(3)}`;
    expect(splitIntoCaseChunks(text).length).toBe(3);
  });

  it('matches bare "Case N" with no trailing punctuation (ISB style)', () => {
    const text = `Case 1${padBody(1)}Case 2${padBody(2)}`;
    expect(splitIntoCaseChunks(text).length).toBe(2);
  });

  it('matches roman numerals (Case I, Case II) — XLRI CRUX style', () => {
    const text = `Case I${padBody(1)}Case II${padBody(2)}Case III${padBody(3)}`;
    expect(splitIntoCaseChunks(text).length).toBe(3);
  });

  it('does not false-trigger on inline "case 5" references', () => {
    const text = 'Some text where we mention case 5 mid-sentence and continue talking.';
    expect(splitIntoCaseChunks(text).length).toBe(1);
  });
});

describe('isLikelyWholeDocument', () => {
  it('flags chunks that exceed MAX_CASE_CHARS', () => {
    const huge = 'x'.repeat(MAX_CASE_CHARS + 1);
    expect(isLikelyWholeDocument(huge)).toBe(true);
  });
  it('passes plausibly-sized case chunks', () => {
    const ok = 'x'.repeat(10_000);
    expect(isLikelyWholeDocument(ok)).toBe(false);
  });
});
