import { createHash } from "node:crypto";

export type RateLimitRule = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export function consumeRateLimit(
  key: string,
  rule: RateLimitRule,
  now = Date.now(),
): RateLimitResult {
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + rule.windowMs };
  }
  bucket.count += 1;
  buckets.delete(key);
  buckets.set(key, bucket);

  while (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next().value as string | undefined;
    if (!oldest) break;
    buckets.delete(oldest);
  }

  return {
    allowed: bucket.count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export function requestFingerprint(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address =
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    forwarded ||
    "unknown";
  return createHash("sha256").update(address).digest("hex").slice(0, 24);
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
