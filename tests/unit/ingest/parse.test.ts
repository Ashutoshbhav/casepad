import { describe, it, expect } from 'vitest';
import { needsOcr, splitIntoCaseChunks } from '../../../scripts/ingest/parse';
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
});
