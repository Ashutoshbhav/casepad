import { describe, it, expect } from 'vitest';
import { nextSentenceBoundary } from '@/lib/interview/sentence-stream';

// The streaming speaker carves the interviewer reply into ~sentence chunks as
// tokens arrive, so text-to-speech can start on sentence 1 instead of waiting
// for the whole turn. This guards the boundary detector: it must only fire on
// a COMPLETE sentence (terminal punctuation followed by whitespace), never on
// the partial token at the growing buffer's edge.
describe('nextSentenceBoundary', () => {
  it('returns -1 while the sentence is still streaming', () => {
    expect(nextSentenceBoundary('Walk me through your structur', 0)).toBe(-1);
    expect(nextSentenceBoundary('Why those buckets', 0)).toBe(-1);
    // terminal punctuation but nothing after it yet — not complete
    expect(nextSentenceBoundary('Walk me through that.', 0)).toBe(-1);
  });

  it('fires just past the punctuation once whitespace follows', () => {
    const s = 'Walk me through that. Why those buckets?';
    expect(s.slice(0, nextSentenceBoundary(s, 0))).toBe('Walk me through that.');
  });

  it('includes a trailing closing quote in the cut', () => {
    const s = 'She said "no." Then she left.';
    expect(s.slice(0, nextSentenceBoundary(s, 0))).toBe('She said "no."');
  });

  it('respects the from offset (already-consumed text)', () => {
    const s = 'First point. Second point. Third';
    const first = nextSentenceBoundary(s, 0);
    expect(s.slice(0, first)).toBe('First point.');
    const second = nextSentenceBoundary(s, first);
    expect(s.slice(first, second).trim()).toBe('Second point.');
    expect(nextSentenceBoundary(s, second)).toBe(-1);
  });

  it('handles ! ? and the ellipsis character', () => {
    expect(nextSentenceBoundary('Try again — sharper! Now go.', 0)).toBe('Try again — sharper!'.length);
    expect(nextSentenceBoundary('Are you sure? Walk me through it.', 0)).toBe('Are you sure?'.length);
    expect(nextSentenceBoundary('Hmm… let me think about that one.', 0)).toBe('Hmm…'.length);
  });

  it('is safe on empty / out-of-range input', () => {
    expect(nextSentenceBoundary('', 0)).toBe(-1);
    expect(nextSentenceBoundary('abc', 10)).toBe(-1);
  });
});
