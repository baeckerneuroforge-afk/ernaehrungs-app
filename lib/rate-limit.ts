import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import * as Sentry from "@sentry/nextjs";

// Window type accepted by Ratelimit.slidingWindow ("1 m", "1 h", "1 d", …).
// Derived from the SDK so we don't import a possibly-unexported type name.
type Duration = Parameters<typeof Ratelimit.slidingWindow>[1];

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// ---------------------------------------------------------------------------
// Limiter config. Each limiter carries its limit + window in BOTH forms:
//   - upstash: the Redis-backed sliding window (null if Upstash isn't set up)
//   - limit/windowMs: the same numbers, so the in-memory fallback below can
//     enforce the SAME budget when Redis is missing or down (no fail-open).
// Callers still pass `xxxLimiter` to checkRateLimit() unchanged.
// ---------------------------------------------------------------------------
export type RateLimiterConfig = {
  upstash: Ratelimit | null;
  limit: number;
  windowMs: number;
  prefix: string;
};

function durationToMs(d: string): number {
  const m = /^(\d+)\s*(ms|s|m|h|d)$/.exec(d.trim());
  if (!m) return 60_000;
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case "ms": return n;
    case "s": return n * 1000;
    case "m": return n * 60_000;
    case "h": return n * 3_600_000;
    case "d": return n * 86_400_000;
    default: return 60_000;
  }
}

function makeLimiter(limit: number, window: Duration, prefix: string): RateLimiterConfig {
  return {
    upstash: redis
      ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, window), prefix })
      : null,
    limit,
    windowMs: durationToMs(window),
    prefix,
  };
}

export const chatLimiter = makeLimiter(20, "1 m", "rl:chat");
export const planLimiter = makeLimiter(5, "1 h", "rl:plan");
export const fotoLimiter = makeLimiter(10, "1 d", "rl:foto");
export const exportLimiter = makeLimiter(1, "1 h", "rl:export");
export const messagesLimiter = makeLimiter(60, "1 m", "rl:messages");
export const tagebuchLimiter = makeLimiter(30, "1 m", "rl:tagebuch");
export const trackerLimiter = makeLimiter(30, "1 m", "rl:tracker");
export const wochencheckLimiter = makeLimiter(10, "1 d", "rl:wochencheck");
export const importLimiter = makeLimiter(5, "1 h", "rl:import");
export const feedbackLimiter = makeLimiter(10, "1 m", "rl:feedback");
export const profileLimiter = makeLimiter(10, "1 m", "rl:profile");
export const settingsLimiter = makeLimiter(5, "1 m", "rl:settings");
export const supportLimiter = makeLimiter(3, "1 h", "rl:support");
export const documentsLimiter = makeLimiter(10, "1 h", "rl:documents");

// ---------------------------------------------------------------------------
// In-memory sliding-window fallback. Per-instance (not shared across Vercel
// function instances), so it's weaker than Redis — but it's a real safety net
// against the previous fail-OPEN behaviour where a missing/broken Redis turned
// rate limiting fully OFF. An attacker hammering a single warm instance still
// gets throttled; the cost-/abuse-blast-radius stays bounded.
// ---------------------------------------------------------------------------
const memoryHits = new Map<string, number[]>();
const MEMORY_MAX_KEYS = 10_000;

function inMemoryAllow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (memoryHits.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= limit) {
    memoryHits.set(key, hits);
    return false;
  }
  hits.push(now);
  memoryHits.set(key, hits);
  // Crude leak guard: Map preserves insertion order, so dropping the first key
  // evicts the oldest-touched bucket once we exceed the cap.
  if (memoryHits.size > MEMORY_MAX_KEYS) {
    const oldest = memoryHits.keys().next().value;
    if (oldest !== undefined) memoryHits.delete(oldest);
  }
  return true;
}

// Fire the "Redis missing in production" alert only once per instance so a
// misconfiguration is visible without spamming Sentry on every request.
let _missingConfigWarned = false;
function warnMissingConfigOnce(): void {
  if (_missingConfigWarned) return;
  _missingConfigWarned = true;
  console.error(
    "[rate-limit] Upstash Redis not configured in production — falling back to per-instance in-memory limits"
  );
  Sentry.captureMessage(
    "Rate limiting degraded: Upstash Redis not configured in production (using in-memory fallback)",
    "error"
  );
}

export async function checkRateLimit(
  limiter: RateLimiterConfig | null,
  identifier: string
): Promise<{ success: boolean; remaining?: number }> {
  const isProd = process.env.NODE_ENV === "production";

  // Defensive: no config object passed at all.
  if (!limiter) return { success: true };

  // Primary path: Redis-backed limiter is configured.
  if (limiter.upstash) {
    try {
      const result = await limiter.upstash.limit(identifier);
      return { success: result.success, remaining: result.remaining };
    } catch (err) {
      // Transient Redis outage. Failing OPEN would disable every limit during
      // the outage; instead fall back to the per-instance in-memory budget in
      // production so the cost-/abuse-cap still holds. Dev stays open for DX.
      console.error("[rate-limit] Redis error, using in-memory fallback:", err);
      if (isProd) {
        Sentry.captureException(err, {
          level: "warning",
          tags: { area: "rate-limit" },
        });
        return {
          success: inMemoryAllow(
            `${limiter.prefix}:${identifier}`,
            limiter.limit,
            limiter.windowMs
          ),
        };
      }
      return { success: true };
    }
  }

  // No Upstash configured.
  if (isProd) {
    // Misconfiguration in production: alert loudly ONCE, but do NOT run fully
    // open — enforce the same budget in-memory as a safety net.
    warnMissingConfigOnce();
    return {
      success: inMemoryAllow(
        `${limiter.prefix}:${identifier}`,
        limiter.limit,
        limiter.windowMs
      ),
    };
  }

  // Local dev without Redis: no limiting (keeps local tinkering frictionless).
  return { success: true };
}
