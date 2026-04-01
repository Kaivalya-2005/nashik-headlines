const IORedis = require("ioredis");
const redis = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

const cacheMiddleware = (durationInSeconds) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl || req.url}`;
    try {
      const cached = await redis.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Cache successful responses only (avoid caching errors)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.setex(key, durationInSeconds, JSON.stringify(body));
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error("Redis Cache Middleware Error:", err);
      next();
    }
  };
};

const clearCache = async (prefix = "cache:/api/articles") => {
  try {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Cleared ${keys.length} cache entries for prefix ${prefix}`);
    }
  } catch (err) {
    console.error("Redis Clear Cache Error:", err);
  }
};

module.exports = { redis, cacheMiddleware, clearCache };
