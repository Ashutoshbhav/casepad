// Rate limiter with two backends:
//
//   1. checkRateLimit() — in-memory sliding window. Per-lambda + resets on
//      cold-start, so under a public flood the real ceiling is "limit ×
//      warm-instances". Fine as a fallback / for a private cohort.
//   2. rateLimit() — async; uses Upstash Redis sliding window (persistent +
//      SHARED across every Vercel lambda) when UPSTASH_REDIS_REST_URL +
//      UPSTASH_REDIS_REST_TOKEN are set, else delegates to checkRateLimit.
//      On any Upstash error it falls back to the in-memory limiter, so a Redis
//      outage degrades — never blocks a legit user. (FORTRESS / fail-open.)
//
// Pre-wired: with no Upstash env vars set, rateLimit() === the old in-memory
// behavior, so shipping this changes nothing until the env vars are added.

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

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

// ---- Upstash-backed async limiter (persistent, cross-instance) -------------

const UPSTASH_ENABLED =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

// Lazy singletons — only constructed when Upstash is configured, so the build
// (and dev with no env) never touches Redis.
let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) _redis = Redis.fromEnv();
  return _redis;
}

// One Ratelimit instance per (max, windowMs) config — reused across calls
// (constructing per-request is wasteful + breaks the lib's internal caching).
const limiters = new Map<string, Ratelimit>();
function getLimiter(max: number, windowMs: number): Ratelimit {
  const cacheKey = `${max}:${windowMs}`;
  let rl = limiters.get(cacheKey);
  if (!rl) {
    rl = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
      prefix: 'casepad:rl',
      analytics: false,
    });
    limiters.set(cacheKey, rl);
  }
  return rl;
}

let _warnedUpstashError = false;

/**
 * Async rate-limit check. Uses Upstash Redis (shared across all Vercel
 * instances) when configured; otherwise — and on any Upstash error — falls back
 * to the in-memory limiter. Same return shape as checkRateLimit.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<{ ok: boolean; retryAfterSec: number }> {
  if (!UPSTASH_ENABLED) return checkRateLimit(key, max, windowMs);
  try {
    const { success, reset } = await getLimiter(max, windowMs).limit(key);
    if (success) return { ok: true, retryAfterSec: 0 };
    const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return { ok: false, retryAfterSec };
  } catch (err) {
    // Redis outage / bad creds — degrade to in-memory rather than block users.
    if (!_warnedUpstashError) {
      _warnedUpstashError = true;
      console.warn(`[rate-limit] Upstash error, falling back to in-memory: ${(err as Error).message}`);
    }
    return checkRateLimit(key, max, windowMs);
  }
}
