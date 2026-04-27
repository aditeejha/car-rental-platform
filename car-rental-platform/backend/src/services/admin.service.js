const { pool } = require('../db/pool');

async function metrics() {
  const totalCars   = (await pool.query(`SELECT COUNT(*)::int c FROM cars`)).rows[0].c;
  const activeCars  = (await pool.query(`SELECT COUNT(*)::int c FROM cars WHERE available=TRUE`)).rows[0].c;
  const totalUsers  = (await pool.query(`SELECT COUNT(*)::int c FROM users`)).rows[0].c;

  const bookingsAgg = (await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status='active')::int    AS active,
      COUNT(*) FILTER (WHERE status='completed')::int AS completed,
      COUNT(*) FILTER (WHERE status='disputed')::int  AS disputed,
      COALESCE(SUM(total_cents) FILTER (WHERE status IN ('completed','active')),0)::bigint AS revenue_cents
    FROM bookings
  `)).rows[0];

  const utilization = (await pool.query(`
    SELECT
      c.id, c.make, c.model,
      COUNT(b.id)::int AS bookings,
      COALESCE(SUM(EXTRACT(EPOCH FROM (b.end_at - b.start_at))/86400)::int,0) AS booked_days,
      COALESCE(SUM(b.total_cents),0)::bigint AS revenue_cents
    FROM cars c
    LEFT JOIN bookings b ON b.car_id=c.id AND b.status IN ('confirmed','active','completed')
    GROUP BY c.id ORDER BY revenue_cents DESC LIMIT 10
  `)).rows;

  const disputes = (await pool.query(`
    SELECT COUNT(*)::int total,
           COUNT(*) FILTER (WHERE status='open')::int open,
           COUNT(*) FILTER (WHERE status='resolved')::int resolved
      FROM disputes
  `)).rows[0];

  return {
    fleet: { total: totalCars, available: activeCars },
    users: { total: totalUsers },
    bookings: bookingsAgg,
    utilization,
    disputes,
  };
}

module.exports = { metrics };
