const redis = require('../config/redis');

function aiRateLimiter(limit = 10) {
  return async (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const key = `rate:ai:${userId}`;

    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, 60);
      }

      if (count > limit) {
        return res.status(429).json({ code: 429, message: 'AI 调用过于频繁，请稍后再试' });
      }
    } catch (error) {
      console.warn('[rate-limit] degraded:', error.message);
    }

    return next();
  };
}

module.exports = {
  aiRateLimiter,
};
