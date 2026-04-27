const { pool } = require('../db/pool');
const booking = require('./booking.service');
const image = require('./image.service');

// Process a batch of actions from the offline queue.
// Each action carries client_ref so it is idempotent.
async function processBatch({ userId, actions }) {
  const results = [];
  for (const a of actions || []) {
    try {
      let result;
      if (a.type === 'booking.create') {
        result = await booking.createBooking({
          userId,
          carId:    a.payload.carId,
          startAt:  a.payload.startAt,
          endAt:    a.payload.endAt,
          clientRef: a.clientRef,
        });
      } else if (a.type === 'image.attach') {
        result = await image.attachTripImage({
          bookingId:   a.payload.bookingId,
          uploaderId:  userId,
          phase:       a.payload.phase,
          angle:       a.payload.angle,
          imageUrl:    a.payload.imageUrl,
          capturedAt:  a.payload.capturedAt,
          lat:         a.payload.lat,
          lng:         a.payload.lng,
          hash:        a.payload.hash,
          meta:        a.payload.meta || {},
        });
      } else {
        throw new Error(`Unknown action type: ${a.type}`);
      }

      await pool.query(
        `INSERT INTO sync_log (user_id, client_ref, action_type, payload, result, detail)
         VALUES ($1,$2,$3,$4::jsonb,'accepted',NULL)
         ON CONFLICT (client_ref, action_type) DO NOTHING`,
        [userId, a.clientRef, a.type, JSON.stringify(a.payload)]
      );
      results.push({ clientRef: a.clientRef, status: 'accepted', result });
    } catch (err) {
      const status = err.status === 409 ? 'conflict' : 'rejected';
      await pool.query(
        `INSERT INTO sync_log (user_id, client_ref, action_type, payload, result, detail)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6)
         ON CONFLICT (client_ref, action_type) DO UPDATE SET detail=EXCLUDED.detail, result=EXCLUDED.result`,
        [userId, a.clientRef, a.type, JSON.stringify(a.payload), status, err.message]
      );
      results.push({ clientRef: a.clientRef, status, error: err.message });
    }
  }
  return { processed: results.length, results };
}

module.exports = { processBatch };
