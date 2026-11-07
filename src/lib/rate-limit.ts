import { NextRequest, NextResponse } from "next/server";
import { getTenantModels, CompanyTenant } from "./mongodb";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  retryAfter: number; // in seconds
}

// In-memory sliding window fallback cache for resilience
interface MemoryEntry {
  count: number;
  resetAt: number;
}
const memoryCache = new Map<string, MemoryEntry>();

// Clean expired memory cache entries periodically
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  memoryCache.forEach((entry, key) => {
    if (entry.resetAt <= now) {
      memoryCache.delete(key);
    }
  });
}, 60000);
if (cleanupInterval && typeof cleanupInterval.unref === "function") {
  cleanupInterval.unref();
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

/**
 * Shared production-grade rate limiter backed by MongoDB atomic operations + TTL index.
 * Guarantees consistent rate limiting across multiple serverless/container deployment instances.
 */
export async function checkRateLimit(options: {
  key: string;
  limit: number;
  windowSeconds: number;
  company?: CompanyTenant;
}): Promise<RateLimitResult> {
  const { key, limit, windowSeconds, company = "plynest" } = options;
  const now = new Date();
  const nowMs = now.getTime();
  const windowEnd = new Date(nowMs + windowSeconds * 1000);

  try {
    const { RateLimit } = await getTenantModels(company);

    // Atomic findOneAndUpdate handles distributed multi-instance synchronization
    const record = await RateLimit.findOneAndUpdate(
      { key },
      {
        $inc: { count: 1 },
        $setOnInsert: { expireAt: windowEnd },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const count = record.count;
    const retryAfter = Math.max(1, Math.ceil((record.expireAt.getTime() - nowMs) / 1000));
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);

    return {
      allowed,
      count,
      limit,
      remaining,
      retryAfter,
    };
  } catch (dbError) {
    // Graceful fallback to memory limiter if database is temporarily unreachable
    const existing = memoryCache.get(key);
    if (!existing || existing.resetAt <= nowMs) {
      memoryCache.set(key, { count: 1, resetAt: nowMs + windowSeconds * 1000 });
      return { allowed: true, count: 1, limit, remaining: limit - 1, retryAfter: windowSeconds };
    }

    existing.count += 1;
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - nowMs) / 1000));
    const allowed = existing.count <= limit;
    const remaining = Math.max(0, limit - existing.count);

    return {
      allowed,
      count: existing.count,
      limit,
      remaining,
      retryAfter,
    };
  }
}

export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}

/**
 * Convenience helper for authenticating endpoints: 5 attempts per 15 minutes
 */
export async function checkAuthRateLimit(
  identifier: string,
  request: NextRequest,
  company: CompanyTenant = "plynest"
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  const cleanId = identifier.trim().toLowerCase();
  const key = `auth:${company}:${ip}:${cleanId}`;
  return checkRateLimit({
    key,
    limit: 5,
    windowSeconds: 15 * 60, // 15 minutes
    company,
  });
}

/**
 * Convenience helper for password change: 5 attempts per 15 minutes
 */
export async function checkPasswordRateLimit(
  userId: string,
  request: NextRequest,
  company: CompanyTenant = "plynest"
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  const key = `pwd:${company}:${userId}:${ip}`;
  return checkRateLimit({
    key,
    limit: 5,
    windowSeconds: 15 * 60,
    company,
  });
}
