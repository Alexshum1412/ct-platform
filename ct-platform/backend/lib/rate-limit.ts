import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import Redis from 'ioredis';

// Create Redis client if URL is provided
const redisClient = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL)
  : null;

// Rate limiter for API endpoints
export const apiLimiter = redisClient
  ? new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'api_limit',
      points: 100, // 100 requests
      duration: 900, // per 15 minutes
    })
  : new RateLimiterMemory({
      keyPrefix: 'api_limit',
      points: 100,
      duration: 900,
    });

// Stricter limiter for auth endpoints
export const authLimiter = redisClient
  ? new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'auth_limit',
      points: 5, // 5 attempts
      duration: 300, // per 5 minutes
    })
  : new RateLimiterMemory({
      keyPrefix: 'auth_limit',
      points: 5,
      duration: 300,
    });

// Limiter for question submissions
export const questionLimiter = redisClient
  ? new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'question_limit',
      points: 50, // 50 submissions
      duration: 3600, // per hour
    })
  : new RateLimiterMemory({
      keyPrefix: 'question_limit',
      points: 50,
      duration: 3600,
    });

export async function checkRateLimit(
  limiter: RateLimiterRedis | RateLimiterMemory,
  key: string
): Promise<{ allowed: boolean; remaining: number; resetTime?: Date }> {
  try {
    const result = await limiter.consume(key);
    return {
      allowed: true,
      remaining: result.remainingPoints,
    };
  } catch (rejRes: any) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(Date.now() + rejRes.msBeforeNext),
    };
  }
}
