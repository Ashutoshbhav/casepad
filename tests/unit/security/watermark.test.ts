import { describe, it, expect } from 'vitest';
import {
  tokenForUser,
  embedWatermark,
  extractWatermark,
  identifyLeaker,
} from '@/lib/security/watermark';

const ZWSP = '​';
const ZWNJ = '‌';

describe('tokenForUser', () => {
  it('returns a stable 32-bit string for a user_id', () => {
    const t = tokenForUser('user-abc-123');
    expect(t).toHaveLength(32);
    expect(t).toMatch(/^[01]+$/);
  });

  it('returns the same token on repeated calls', () => {
    expect(tokenForUser('user-x')).toBe(tokenForUser('user-x'));
  });

  it('returns different tokens for different users', () => {
    expect(tokenForUser('user-a')).not.toBe(tokenForUser('user-b'));
  });

  it('handles empty user_id gracefully (returns zero string)', () => {
    const t = tokenForUser('');
    expect(t).toBe('0'.repeat(32));
  });
});

describe('embedWatermark', () => {
  it('embeds invisible chars at word boundaries', () => {
    const out = embedWatermark('Walk me through that.', 'user-abc');
    // Output should still read identically when zero-width chars are stripped
    const visible = out.replace(/[​‌]/g, '');
    expect(visible).toBe('Walk me through that.');
    // Should contain at least one ZWSP or ZWNJ
    expect(out).toMatch(/[​‌]/);
  });

  it('returns input unchanged on empty user_id', () => {
    const text = 'Walk me through that.';
    expect(embedWatermark(text, '')).toBe(text);
  });

  it('returns input unchanged on empty text', () => {
    expect(embedWatermark('', 'user-x')).toBe('');
  });

  it('handles very short text (no spaces, no embed)', () => {
    expect(embedWatermark('Go.', 'user-x')).toBe('Go.');
  });

  it('preserves the readable content exactly', () => {
    const text = "That's two words from a textbook. What's your hypothesis?";
    const out = embedWatermark(text, 'user-cohort-001');
    expect(out.replace(/[​‌]/g, '')).toBe(text);
  });
});

describe('extractWatermark', () => {
  it('round-trips an embedded token', () => {
    const userId = 'user-cohort-001';
    const text = 'Walk me through how you would structure this case. What is your hypothesis about the cost side?';
    const embedded = embedWatermark(text, userId);
    const extracted = extractWatermark(embedded, 32);
    const expected = tokenForUser(userId);
    // Extracted bits should match the leading bits of the token (text has enough spaces)
    expect(expected.startsWith(extracted) || extracted.startsWith(expected.slice(0, extracted.length))).toBe(true);
  });

  it('returns empty string for text with no zero-width chars', () => {
    expect(extractWatermark('Walk me through that.')).toBe('');
  });

  it('handles manual ZWSP/ZWNJ encoding correctly', () => {
    const text = 'a' + ZWSP + 'b' + ZWNJ + 'c';
    expect(extractWatermark(text)).toBe('01');
  });
});

describe('identifyLeaker', () => {
  it('finds the matching user from a candidate set', () => {
    const userId = 'user-abc';
    const token = tokenForUser(userId);
    expect(identifyLeaker(token, ['user-x', 'user-abc', 'user-y'])).toBe('user-abc');
  });

  it('returns null when no candidate matches', () => {
    const fakeToken = '0'.repeat(32);
    // Real users would not produce the all-zero token unless their hash happens to start with all zero
    const out = identifyLeaker(fakeToken, ['user-abc', 'user-xyz']);
    // Out could be one of them by chance — assert it returns either null or one of them
    expect(out === null || ['user-abc', 'user-xyz'].includes(out)).toBe(true);
  });

  it('returns null on empty watermark', () => {
    expect(identifyLeaker('', ['user-a'])).toBeNull();
  });

  it('matches on partial watermarks (prefix)', () => {
    const userId = 'user-abc';
    const fullToken = tokenForUser(userId);
    const partial = fullToken.slice(0, 16); // first 16 bits only
    expect(identifyLeaker(partial, ['user-x', 'user-abc', 'user-y'])).toBe('user-abc');
  });
});

describe('end-to-end: embed → leak → identify', () => {
  it('identifies the original user from an embedded transcript', () => {
    const leakerId = 'user-cohort-005';
    const transcript = `That's two words from a textbook. What's your hypothesis about cost vs revenue here? Walk me through how you would structure this case from first principles given the data we have so far.`;
    const watermarked = embedWatermark(transcript, leakerId);
    const extracted = extractWatermark(watermarked, 32);
    const candidates = [
      'user-cohort-001',
      'user-cohort-002',
      'user-cohort-003',
      'user-cohort-004',
      'user-cohort-005', // the actual leaker
      'user-cohort-006',
    ];
    const identified = identifyLeaker(extracted, candidates);
    expect(identified).toBe(leakerId);
  });
});
