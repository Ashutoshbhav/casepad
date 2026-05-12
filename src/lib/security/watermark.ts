// src/lib/security/watermark.ts
//
// Steganographic watermark for Ash's responses. Embeds a per-account
// fingerprint as invisible zero-width Unicode characters between words.
// If a transcript leaks (the file at Downloads/casepad-pm-interview-prep.md
// is the exact use-case), we can decode the watermark and trace which
// account exfiltrated it.
//
// Why zero-width chars: they render as nothing in the chat UI, paste
// cleanly into Word/Notion/markdown, and survive most copy-paste flows.
// They DO get stripped by aggressive normalizers (e.g. some Slack clients)
// — that's an acceptable bypass for a low-friction defense.
//
// Encoding:
//   - ZWSP (U+200B) = bit 0
//   - ZWNJ (U+200C) = bit 1
//   - We embed a 32-bit token derived from sha256(user_id) — irreversible
//     without the supabase user lookup, but reversible WITH it: scan all
//     known user_ids, hash each, compare to the leaked token.
//
// Position: inserted at word boundaries, NOT inside words (preserves
// readability + word-count counting). Only on spaces, so the chat UI
// renders identical to without-watermark.

import { createHash } from 'node:crypto';

const ZWSP = '​'; // bit 0
const ZWNJ = '‌'; // bit 1
const TOKEN_BITS = 32; // 32 bits = 4B distinct accounts before collision

/**
 * Derive a stable 32-bit token from a user_id. Same user always gets the
 * same token. Different users get different tokens (with negligible
 * collision risk at our scale).
 */
export function tokenForUser(userId: string): string {
  if (!userId) return '0'.repeat(TOKEN_BITS);
  const hash = createHash('sha256').update(userId).digest();
  let bits = '';
  for (let i = 0; bits.length < TOKEN_BITS && i < hash.length; i++) {
    bits += hash[i].toString(2).padStart(8, '0');
  }
  return bits.slice(0, TOKEN_BITS);
}

/**
 * Embed the user's watermark token into a response by inserting zero-width
 * chars at word boundaries. We need ≥32 spaces to encode the full token;
 * if the response is too short, we encode what fits (still unique enough
 * over multiple turns to identify the leaker).
 *
 * Returns the watermarked string. Always safe — if input is malformed,
 * returns input unchanged.
 */
export function embedWatermark(text: string, userId: string): string {
  if (!text || typeof text !== 'string' || !userId) return text;
  const bits = tokenForUser(userId);
  // Split on word boundaries; we'll join with watermarked separators
  const words = text.split(/(\s+)/); // captures spaces so we can rebuild exactly
  if (words.length < 2) return text;

  let bitIndex = 0;
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    out.push(words[i]);
    // Only embed after whitespace tokens (so the marker sits between words)
    if (/^\s+$/.test(words[i]) && bitIndex < bits.length) {
      const bit = bits[bitIndex];
      out.push(bit === '1' ? ZWNJ : ZWSP);
      bitIndex++;
    }
  }
  return out.join('');
}

/**
 * Extract the watermark token from a possibly-leaked transcript chunk.
 * Reads zero-width chars in order; returns the bit-string.
 *
 * Use: scan a leaked doc / transcript paste, run this on Ash turns, then
 * compare against tokenForUser() for each cohort member to identify the
 * source.
 */
export function extractWatermark(text: string, expectedBits = TOKEN_BITS): string {
  if (!text) return '';
  let bits = '';
  for (let i = 0; i < text.length && bits.length < expectedBits; i++) {
    if (text[i] === ZWSP) bits += '0';
    else if (text[i] === ZWNJ) bits += '1';
  }
  return bits;
}

/**
 * Reverse-lookup helper: given a set of candidate user IDs and a watermark,
 * find which user the watermark belongs to. Returns null if no match.
 *
 * Caller: pass all allowlisted user IDs from Supabase.
 */
export function identifyLeaker(
  watermarkBits: string,
  candidateUserIds: string[]
): string | null {
  if (!watermarkBits) return null;
  for (const uid of candidateUserIds) {
    const expected = tokenForUser(uid);
    // Allow partial match (transcripts truncate) — compare prefix
    const compareLen = Math.min(watermarkBits.length, expected.length);
    if (watermarkBits.slice(0, compareLen) === expected.slice(0, compareLen)) {
      return uid;
    }
  }
  return null;
}
