// src/lib/interview/sentence-stream.ts
//
// Pure helper for the live-interview streaming speaker. As the interviewer
// reply streams in token-by-token, the speaker carves it into ~sentence
// chunks so text-to-speech can start on sentence 1 instead of waiting for the
// whole turn. This module owns the "is there a complete sentence yet?" call.

/**
 * Index just past a sentence-ending punctuation mark that IS followed by
 * whitespace — i.e. a genuinely complete sentence boundary, not the partial
 * token at the growing buffer's edge. Returns -1 when nothing complete has
 * arrived since `from`. Any closing quote/bracket right after the punctuation
 * is included in the returned cut. Pure + total.
 */
export function nextSentenceBoundary(s: string, from: number): number {
  for (let i = Math.max(0, from); i < s.length - 1; i++) {
    const c = s[i];
    if (c === '.' || c === '!' || c === '?' || c === '…') {
      let j = i + 1;
      while (j < s.length && '"\'’”)]'.includes(s[j])) j++;
      if (j < s.length && /\s/.test(s[j])) return j;
    }
  }
  return -1;
}
