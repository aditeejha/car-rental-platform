const IORedis = require('ioredis');
const config = require('../config');

const redis = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('error', (err) => console.error('Redis error', err.message));

module.exports = redis;
