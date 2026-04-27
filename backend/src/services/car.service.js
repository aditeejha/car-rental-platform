const { pool } = require('../db/pool');
const pricing = require('./pricing.service');
const { notFound } = require('../utils/errors');

const CAR_FIELDS = `
  id, owner_id, make, model, year, category, transmission, fuel_type,
  seats, luggage, base_price_cents, current_price_cents,
  city, lat, lng, hero_image_url, gallery, features, safety_rating, available
`;

async function listCars(q = {}) {
  const limit  = Math.min(Number(q.limit  || 12), 60);
  const offset = Math.max(Number(q.offset || 0), 0);
  const whereParams = [];
  const where = ['available=TRUE'];

  if (q.city)        { whereParams.push(q.city);        where.push(`LOWER(city)=LOWER($${whereParams.length})`); }
  if (q.category)    { whereParams.push(q.category);    where.push(`category=$${whereParams.length}`); }
  if (q.transmission){ whereParams.push(q.transmission);where.push(`transmission=$${whereParams.length}`); }
  if (q.maxPrice)    { whereParams.push(Number(q.maxPrice)); where.push(`current_price_cents<=$${whereParams.length}`); }
  if (q.minSeats)    { whereParams.push(Number(q.minSeats)); where.push(`seats>=$${whereParams.length}`); }

  // distance sort if user lat/lng given (extra params for ORDER BY only)
  const listParams = [...whereParams];
  let order = 'ORDER BY current_price_cents ASC';
  if (q.lat && q.lng) {
    listParams.push(Number(q.lat));
    listParams.push(Number(q.lng));
    order = `ORDER BY (
       (lat - $${listParams.length - 1}) * (lat - $${listParams.length - 1})
     + (lng - $${listParams.length})     * (lng - $${listParams.length})
    ) ASC`;
  }

  // record demand signal
  if (q.city) await pricing.bumpDemand(q.city);

  listParams.push(limit);
  listParams.push(offset);
  const { rows } = await pool.query(
    `SELECT ${CAR_FIELDS} FROM cars
     WHERE ${where.join(' AND ')}
     ${order}
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  const { rows: count } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM cars WHERE ${where.join(' AND ')}`,
    whereParams
  );

  return { items: rows.map(serializeCar), total: count[0].total, limit, offset };
}

async function getCarById(id) {
  const { rows } = await pool.query(
    `SELECT ${CAR_FIELDS} FROM cars WHERE id=$1`,
    [id]
  );
  if (!rows.length) throw notFound('Car not found');
  return serializeCar(rows[0]);
}

function serializeCar(r) {
  return {
    id: r.id,
    ownerId: r.owner_id,
    make: r.make,
    model: r.model,
    year: r.year,
    category: r.category,
    transmission: r.transmission,
    fuelType: r.fuel_type,
    seats: r.seats,
    luggage: r.luggage,
    basePrice: r.base_price_cents / 100,
    price: r.current_price_cents / 100,
    city: r.city,
    lat: r.lat, lng: r.lng,
    heroImage: r.hero_image_url,
    gallery: r.gallery || [],
    features: r.features || [],
    safetyRating: Number(r.safety_rating),
    available: r.available,
  };
}

// Smart recommendations: rank cars by fit score given user inputs.
async function recommend({ budget, passengers, luggage, tripType, city }) {
  const params = ['available=TRUE'];
  const args = [];
  if (city) { args.push(city); params.push(`LOWER(city)=LOWER($${args.length})`); }
  const { rows } = await pool.query(
    `SELECT ${CAR_FIELDS} FROM cars WHERE ${params.join(' AND ')} LIMIT 200`,
    args
  );

  const scored = rows.map((r) => {
    const c = serializeCar(r);
    let score = 100;
    if (budget && c.price > budget) score -= Math.min(50, ((c.price - budget) / budget) * 100);
    if (passengers && c.seats < passengers) score -= 40;
    if (luggage && c.luggage < luggage) score -= 25;
    if (tripType === 'offroad' && c.category !== 'suv') score -= 30;
    if (tripType === 'city'    && (c.category === 'suv' || c.category === 'luxury')) score -= 10;
    if (tripType === 'longtrip'&& c.seats < 5) score -= 15;
    return { ...c, fitScore: Math.max(0, Math.round(score)) };
  });

  scored.sort((a, b) => b.fitScore - a.fitScore);
  return scored.slice(0, 8);
}

module.exports = { listCars, getCarById, recommend, serializeCar };
