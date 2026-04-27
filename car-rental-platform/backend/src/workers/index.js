// Background workers — runs notifications + dynamic-pricing recompute.
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');
const pricing = require('../services/pricing.service');
const { pool } = require('../db/pool');

const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });

const notifQ   = new Queue('notifications', { connection });
const pricingQ = new Queue('pricing',       { connection });

new Worker('notifications', async (job) => {
  const { userId, title, body, data } = job.data;
  await pool.query(
    `INSERT INTO notifications (user_id, title, body, data) VALUES ($1,$2,$3,$4::jsonb)`,
    [userId, title, body || '', JSON.stringify(data || {})]
  );
  logger.info({ jobId: job.id }, 'notification persisted');
}, { connection });

new Worker('pricing', async (job) => {
  if (job.data?.city) await pricing.recomputeForCity(job.data.city);
  else await pricing.recomputeAll();
  logger.info('dynamic prices recomputed');
}, { connection });

// Schedule pricing recompute every 15 min.
(async () => {
  await pricingQ.add('recompute-all', {}, {
    repeat: { every: 15 * 60 * 1000 },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  });
  logger.info('worker bootstrapped (notifications, pricing)');
})();

module.exports = { notifQ, pricingQ };
