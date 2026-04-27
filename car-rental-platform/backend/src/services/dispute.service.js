const { pool } = require('../db/pool');
const { notFound } = require('../utils/errors');
const ai = require('../ai');

const REQUIRED_ANGLES = ['front', 'rear', 'left', 'right', 'odometer'];

// Deterministic detection — runs BEFORE we ever call the LLM.
async function analyzeBookingEvidence(bookingId) {
  const b = await pool.query(`SELECT * FROM bookings WHERE id=$1`, [bookingId]);
  if (!b.rowCount) throw notFound('Booking not found');
  const booking = b.rows[0];

  const imgs = await pool.query(
    `SELECT phase, angle, captured_at, uploaded_at
       FROM trip_images WHERE booking_id=$1`,
    [bookingId]
  );

  const pre  = imgs.rows.filter((i) => i.phase === 'pre');
  const post = imgs.rows.filter((i) => i.phase === 'post');

  const issues = [];

  for (const a of REQUIRED_ANGLES) {
    if (!pre.find((i) => i.angle === a)) issues.push({ code: 'MISSING_PRE_IMAGE', angle: a });
    if (!post.find((i) => i.angle === a)) issues.push({ code: 'MISSING_POST_IMAGE', angle: a });
  }

  const tripStart = new Date(booking.start_at).getTime();
  const tripEnd   = new Date(booking.end_at).getTime();
  for (const i of pre) {
    const t = new Date(i.captured_at).getTime();
    if (t > tripStart) issues.push({ code: 'PRE_AFTER_START', angle: i.angle, captured_at: i.captured_at });
  }
  for (const i of post) {
    const t = new Date(i.captured_at).getTime();
    if (t < tripStart || t > tripEnd + 6 * 3600 * 1000) {
      issues.push({ code: 'POST_OUT_OF_WINDOW', angle: i.angle, captured_at: i.captured_at });
    }
  }

  const completeness = {
    pre:  Math.round((REQUIRED_ANGLES.filter((a) => pre.find((i) => i.angle === a)).length / REQUIRED_ANGLES.length) * 100),
    post: Math.round((REQUIRED_ANGLES.filter((a) => post.find((i) => i.angle === a)).length / REQUIRED_ANGLES.length) * 100),
  };

  return { booking, issues, completeness, counts: { pre: pre.length, post: post.length } };
}

async function raise({ bookingId, raisedBy, reason, detail }) {
  const analysis = await analyzeBookingEvidence(bookingId);
  const explanation = await ai.explainDispute({ analysis, reason, detail });

  const { rows } = await pool.query(
    `INSERT INTO disputes (booking_id, raised_by, reason, detail, evidence, ai_explanation)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6) RETURNING *`,
    [bookingId, raisedBy, reason, detail || null, JSON.stringify(analysis.issues), explanation]
  );

  await pool.query(
    `UPDATE bookings SET status='disputed' WHERE id=$1 AND status<>'cancelled'`,
    [bookingId]
  );

  return { ...rows[0], analysis };
}

async function listForUser(userId) {
  const { rows } = await pool.query(
    `SELECT d.* FROM disputes d
       JOIN bookings b ON b.id=d.booking_id
      WHERE b.user_id=$1 OR d.raised_by=$1
      ORDER BY d.created_at DESC`,
    [userId]
  );
  return rows;
}

module.exports = { analyzeBookingEvidence, raise, listForUser };
