/**
 * Fixed-window rate limiter kept in memory.
 *
 * Good enough for a single server. On serverless (several instances) each
 * instance counts separately, so limits are per-instance - swap this for a
 * shared store (e.g. Upstash Redis) before relying on it in production.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
// Upstash's in-process cache is keyed by string → number and must stay separate from `buckets`.
const ephemeralCache = new Map<string, number>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSec: number };

// Optional Upstash Redis limiter
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/** Count one hit for `key`; `ok` is false once more than `limit` hits land in `windowMs`. */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (redis) {
    const windowSecs = Math.max(1, Math.floor(windowMs / 1000));
    const upstashLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(limit, `${windowSecs} s`),
      ephemeralCache,
    });

    const { success, remaining, reset } = await upstashLimiter.limit(key);
    return {
      ok: success,
      remaining,
      retryAfterSec: Math.max(0, Math.ceil((reset - Date.now()) / 1000)),
    };
  }

  // Fallback to in-memory limit
  const now = Date.now();
  sweep(now);
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

export async function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Best-effort client IP from proxy headers. */
export function clientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
