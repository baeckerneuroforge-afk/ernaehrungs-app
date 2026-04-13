import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Graceful degradation: if Upstash isn't configured (e.g. local dev without
// Redis), rate-limiting becomes a no-op. The app stays fully functional.
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

export const chatLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "rl:chat",
    })
  : null;

export const planLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      prefix: "rl:plan",
    })
  : null;

export const fotoLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 d"),
      prefix: "rl:foto",
    })
  : null;

export const exportLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, "1 h"),
      prefix: "rl:export",
    })
  : null;

export const messagesLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "rl:messages",
    })
  : null;

export const tagebuchLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      prefix: "rl:tagebuch",
    })
  : null;

export const trackerLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      prefix: "rl:tracker",
    })
  : null;

export const feedbackLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "rl:feedback",
    })
  : null;

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; remaining?: number }> {
  if (!limiter) return { success: true };
  try {
    const result = await limiter.limit(identifier);
    return { success: result.success, remaining: result.remaining };
  } catch (err) {
    // If Redis is temporarily unreachable, fail open rather than locking
    // paying users out. The trade-off is a short window of no rate-limiting
    // during outages — acceptable given credits still cap total spend.
    console.error("[rate-limit] check failed, failing open:", err);
    return { success: true };
  }
}
