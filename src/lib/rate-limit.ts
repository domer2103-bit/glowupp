import "server-only";
import { headers } from "next/headers";

interface Bucket {
  count: number;
  resetAt: number;
}

// Module-level, survives across requests within one server process — the
// same pattern as src/lib/prisma.ts caching its client on globalThis so
// Next.js's dev hot-reload doesn't lose it. Real protection for this
// app's actual deployment (a single VPS process, not multiple scaled
// instances — see docs/BACKEND_ARCHITECTURE.md §2a), not a placeholder.
// Resets on server restart/deploy, an acceptable trade at this scale; a
// Redis-backed limiter would be the upgrade if this ever moves to
// multiple instances.
const buckets = new Map<string, Bucket>();

const globalForRateLimit = globalThis as unknown as { __rateLimitSweepStarted?: boolean };
if (!globalForRateLimit.__rateLimitSweepStarted) {
  globalForRateLimit.__rateLimitSweepStarted = true;
  const sweep = setInterval(
    () => {
      const now = Date.now();
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt < now) buckets.delete(key);
      }
    },
    10 * 60 * 1000
  );
  sweep.unref();
}

/** Fixed-window check: `max` actions per `windowMs` per `key`. Returns whether this call is allowed. */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= max) return false;

  bucket.count += 1;
  return true;
}

/** Best-effort client IP from the reverse proxy's forwarded headers (Caddy, per docs/BACKEND_ARCHITECTURE.md §2a) — for rate-limiting actions that happen before a user is authenticated. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
