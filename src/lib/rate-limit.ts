// In-memory sliding-window rate limiter. Resets on cold-start (acceptable
// since Vercel's free-tier functions cold-start fairly often, which is
// itself a soft DDoS dampener). For a private cohort tool, this is plenty;
// upgrade to Vercel KV / Upstash if you ever need persistent limits.

const buckets = new Map<string, number[]>();

export function checkRateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) || []).filter((t) => t > cutoff);
  if (hits.length >= max) {
    const earliest = hits[0];
    return { ok: false, retryAfterSec: Math.ceil((earliest + windowMs - now) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  // Light-weight cleanup: every ~100 calls, prune cold keys.
  if (Math.random() < 0.01) {
    for (const [k, ts] of buckets.entries()) {
      if (ts.every((t) => t < cutoff)) buckets.delete(k);
    }
  }
  return { ok: true, retryAfterSec: 0 };
}
