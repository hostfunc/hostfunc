import "server-only";

import { redis } from "@/lib/redis";

const inMemoryHits = new Map<string, { count: number; expiresAt: number }>();

export async function enforceRateLimit(input: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<{ ok: boolean; remaining: number }> {
  const redisKey = `ratelimit:${input.key}`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, input.windowSeconds);
    }
    return { ok: count <= input.limit, remaining: Math.max(0, input.limit - count) };
  } catch {
    const now = Date.now();
    const existing = inMemoryHits.get(redisKey);
    if (!existing || existing.expiresAt <= now) {
      inMemoryHits.set(redisKey, {
        count: 1,
        expiresAt: now + input.windowSeconds * 1000,
      });
      return { ok: true, remaining: input.limit - 1 };
    }
    existing.count += 1;
    inMemoryHits.set(redisKey, existing);
    return { ok: existing.count <= input.limit, remaining: Math.max(0, input.limit - existing.count) };
  }
}
