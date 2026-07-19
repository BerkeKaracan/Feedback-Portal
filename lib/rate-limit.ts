/**
 * Lightweight in-process sliding window rate limiter.
 * Good enough for a single Node/Next server (local + simple deploys).
 * For multi-instance production, swap the store for Redis/Upstash.
 */

type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkRateLimit(
  key: string,
  maxCount: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter(
    (timestamp) => now - timestamp < windowMs
  );

  if (bucket.timestamps.length >= maxCount) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowMs - (now - oldest)) / 1000)
    );
    buckets.set(key, bucket);
    return { ok: false, remaining: 0, retryAfterSeconds };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);

  return {
    ok: true,
    remaining: Math.max(0, maxCount - bucket.timestamps.length),
    retryAfterSeconds: 0,
  };
}

export function clientIpFromRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function isRateLimitError(message: string) {
  return /rate limit|too many|try again in a few/i.test(message);
}

export function formatActionError(error: unknown, fallback: string) {
  let message = "";
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else if (error && typeof error === "object" && "message" in error) {
    message = String((error as { message?: unknown }).message ?? "");
  }

  if (isRateLimitError(message)) {
    return "You're doing that too quickly. Please wait about 30 seconds and try again.";
  }

  return message.trim() || fallback;
}
