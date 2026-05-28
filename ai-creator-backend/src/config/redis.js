const Redis = require('ioredis');
const { redisUrl } = require('./env');

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 2,
  enableReadyCheck: false,
});

redis.on('error', (error) => {
  console.warn('[redis] connection error:', error.message);
});

module.exports = redis;
