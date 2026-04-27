const redis = require('../db/redis');
const { pool } = require('../db/pool');

// Dynamic pricing formula:
//   price = base * demandFactor * timeFactor * scarcityFactor
// Each factor is bounded to keep prices sane.
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

async function searchDemand(city) {
  const key = `demand:city:${city.toLowerCase()}`;
  const v = await redis.get(key);
  return Number(v || 0);
}

async function bumpDemand(city) {
  const key = `demand:city:${city.toLowerCase()}`;
  await redis.incr(key);
  await redis.expire(key, 60 * 30); // 30-min sliding window
}

function timeFactor(date = new Date()) {
  const d = date.getDay();           // 0=Sun..6=Sat
  const h = date.getHours();
  let f = 1.0;
  if (d === 5 || d === 6 || d === 0) f *= 1.15;        // weekend bump
  if (h >= 7 && h <= 10) f *= 1.05;                    // morning peak
  if (h >= 17 && h <= 21) f *= 1.10;                   // evening peak
  return clamp(f, 0.9, 1.4);
}

function demandFactor(searches) {
  // 0..30 => 1.0 .. 1.25
  const f = 1 + Math.min(searches, 60) / 240;
  return clamp(f, 1.0, 1.25);
}

function scarcityFactor(availableInCity) {
  // <=2 cars => x1.2, >=10 => x1.0
  if (availableInCity <= 2) return 1.2;
  if (availableInCity <= 5) return 1.1;
  return 1.0;
}

async function recomputeForCity(city) {
  const searches = await searchDemand(city);
  const tf = timeFactor();
  const df = demandFactor(searches);

  const { rows } = await pool.query(
    `SELECT id, base_price_cents
       FROM cars WHERE city=$1 AND available=TRUE`,
    [city]
  );
  const sf = scarcityFactor(rows.length);

  for (const c of rows) {
    const newPrice = Math.round(c.base_price_cents * tf * df * sf);
    await pool.query(
      'UPDATE cars SET current_price_cents=$1 WHERE id=$2',
      [newPrice, c.id]
    );
  }
  return { city, updated: rows.length, factors: { tf, df, sf, searches } };
}

async function recomputeAll() {
  const { rows } = await pool.query('SELECT DISTINCT city FROM cars');
  const out = [];
  for (const r of rows) out.push(await recomputeForCity(r.city));
  return out;
}

module.exports = { bumpDemand, recomputeForCity, recomputeAll, timeFactor };
