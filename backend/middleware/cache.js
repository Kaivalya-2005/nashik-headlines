const memoryCache = new Map();

const redis = {
  async get(key) {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value;
  },
  async setex(key, durationInSeconds, value) {
    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + (durationInSeconds * 1000),
    });
  },
  async keys(prefix) {
    const matches = [];
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix.replace(/\*$/, ""))) {
        matches.push(key);
      }
    }
    return matches;
  },
  async del(...keys) {
    for (const key of keys) {
      memoryCache.delete(key);
    }
    return keys.length;
  },
};

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
          redis.setex(key, durationInSeconds, JSON.stringify(body)).catch((err) => {
            console.error("Cache set error:", err);
          });
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
