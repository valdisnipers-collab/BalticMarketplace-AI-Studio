import { Redis } from '@upstash/redis';

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn('UPSTASH_REDIS_REST_URL/TOKEN not set — Redis cache disabled');
}

export const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const DAY = 86400;
const MINUTE = 60;
const HOUR = 3600;

export const TTL = {
  omnivaLocations: DAY,
  listingsHome: 5 * MINUTE,
  userProfile: 10 * MINUTE,
  settings: HOUR,
  tokenBlacklist: 7 * 24 * HOUR,
};

export async function cached<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  if (!redis) return fn();

  const hit = await redis.get<T>(key);
  if (hit !== null) return hit;

  const result = await fn();
  await redis.setex(key, ttl, result as any);
  return result;
}

export async function invalidate(key: string) {
  if (!redis) return;
  await redis.del(key);
}

export async function invalidatePattern(pattern: string) {
  if (!redis) return;
  const keys = await redis.keys(pattern);
  const BATCH = 50;
  for (let i = 0; i < keys.length; i += BATCH) {
    await redis.del(...keys.slice(i, i + BATCH));
  }
}

export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  if (!redis) return { allowed: true, remaining: limit, resetIn: windowSeconds };

  const key = `rl:${identifier}`;
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, windowSeconds, 'NX');
  pipeline.ttl(key);
  const results = await pipeline.exec();
  const current = results[0] as number;
  const rawTtl = results[2] as number;
  const resetIn = rawTtl > 0 ? rawTtl : windowSeconds;
  const remaining = Math.max(0, limit - current);
  return {
    allowed: current <= limit,
    remaining,
    resetIn,
  };
}
