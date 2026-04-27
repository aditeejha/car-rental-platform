const { pool, withTx } = require('../db/pool');
const redis = require('../db/redis');
const { conflict, badRequest, notFound, forbidden } = require('../utils/errors');

const LOCK_TTL_MS = 5_000;

async function acquireLock(carId) {
  const key = `lock:car:${carId}`;
  const token = Math.random().toString(36).slice(2);
  const ok = await redis.set(key, token, 'PX', LOCK_TTL_MS, 'NX');
  if (!ok) throw conflict('Car is being booked by another user. Try again.');
  return { key, token };
}

async function releaseLock({ key, token }) {
  // Lua-safe release
  await redis.eval(
    `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`,
    1, key, token
  );
}

async function createBooking({ userId, carId, startAt, endAt, clientRef }) {
  if (!(carId && startAt && endAt)) throw badRequest('carId, startAt, endAt required');

  // Idempotent retry — return prior booking if same clientRef already accepted.
  if (clientRef) {
    const prior = await pool.query(
      `SELECT id FROM bookings WHERE client_ref=$1`, [clientRef]
    );
    if (prior.rowCount) {
      const id = prior.rows[0].id;
      return getBookingById(id);
    }
  }

  const lock = await acquireLock(carId);
  try {
    return await withTx(async (client) => {
      const car = await client.query(
        `SELECT id, current_price_cents, available FROM cars WHERE id=$1 FOR UPDATE`,
        [carId]
      );
      if (!car.rowCount) throw notFound('Car not found');
      if (!car.rows[0].available) throw conflict('Car not available');

      // overlap check
      const clash = await client.query(
        `SELECT 1 FROM bookings
          WHERE car_id=$1
            AND status IN ('confirmed','active')
            AND tstzrange(start_at, end_at, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')
          LIMIT 1`,
        [carId, startAt, endAt]
      );
      if (clash.rowCount) throw conflict('Selected dates overlap an existing booking');

      const startD = new Date(startAt);
      const endD   = new Date(endAt);
      const days   = Math.max(1, Math.round((endD - startD) / (1000 * 60 * 60 * 24)));
      const total  = days * car.rows[0].current_price_cents;

      const ins = await client.query(
        `INSERT INTO bookings (user_id, car_id, start_at, end_at, total_cents, status, client_ref)
         VALUES ($1,$2,$3,$4,$5,'confirmed',$6) RETURNING id`,
        [userId, carId, startAt, endAt, total, clientRef || null]
      );
      const id = ins.rows[0].id;
      return getBookingById(id, client);
    });
  } finally {
    await releaseLock(lock);
  }
}

async function getBookingById(id, client) {
  const q = client || pool;
  const { rows } = await q.query(
    `SELECT b.*, c.make, c.model, c.hero_image_url AS car_image
       FROM bookings b JOIN cars c ON c.id=b.car_id
      WHERE b.id=$1`,
    [id]
  );
  if (!rows.length) throw notFound('Booking not found');
  return serialize(rows[0]);
}

async function listForUser(userId) {
  const { rows } = await pool.query(
    `SELECT b.*, c.make, c.model, c.hero_image_url AS car_image
       FROM bookings b JOIN cars c ON c.id=b.car_id
      WHERE b.user_id=$1
      ORDER BY b.created_at DESC LIMIT 50`,
    [userId]
  );
  return rows.map(serialize);
}

async function cancel(id, userId) {
  const { rows } = await pool.query(
    `UPDATE bookings SET status='cancelled'
      WHERE id=$1 AND user_id=$2 AND status IN ('pending','confirmed')
      RETURNING id, status`,
    [id, userId]
  );
  if (!rows.length) throw forbidden('Cannot cancel booking');
  return rows[0];
}

function serialize(b) {
  return {
    id: b.id,
    userId: b.user_id,
    carId: b.car_id,
    car: { make: b.make, model: b.model, image: b.car_image },
    startAt: b.start_at,
    endAt: b.end_at,
    totalCents: b.total_cents,
    total: b.total_cents / 100,
    status: b.status,
    createdAt: b.created_at,
  };
}

module.exports = { createBooking, getBookingById, listForUser, cancel };
