/**
 * Lightweight in-memory sliding-window rate limiter.
 * NOTE: per-process. Suitable for single-instance deployments; for multi-instance
 * production, swap for a Redis-backed limiter.
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

export function rateLimit(key: string, max = MAX_PER_WINDOW, windowMs = WINDOW_MS): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };

  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= max) {
    const oldest = bucket.timestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    buckets.set(key, bucket);
    return { allowed: false, retryAfterSeconds };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);

  // Opportunistic cleanup
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) {
      const fresh = b.timestamps.filter((t) => now - t < windowMs);
      if (fresh.length === 0) buckets.delete(k);
      else b.timestamps = fresh;
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/** Build a rate-limit key from the request. */
export async function rateLimitKey(prefix: string): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return `${prefix}:${ip}`;
}
