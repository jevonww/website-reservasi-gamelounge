import "server-only";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

/** Simple in-process brute-force guard. For multi-instance deployments use Redis. */
export function checkRateLimit(key: string) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }
  if (bucket.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { allowed: true, remaining: MAX_ATTEMPTS - bucket.count };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
