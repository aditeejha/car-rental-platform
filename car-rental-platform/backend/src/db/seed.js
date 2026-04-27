const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

const cars = [
  {
    make: 'Toyota', model: 'Camry', year: 2023, category: 'sedan',
    transmission: 'automatic', fuel_type: 'petrol', seats: 5, luggage: 3,
    base_price_cents: 4500_00, city: 'Bengaluru', lat: 12.9716, lng: 77.5946,
    hero: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1600&q=80',
    ],
    features: ['Bluetooth', 'Sunroof', 'Cruise control', 'Reverse camera'],
  },
  {
    make: 'Hyundai', model: 'Creta', year: 2024, category: 'suv',
    transmission: 'automatic', fuel_type: 'petrol', seats: 5, luggage: 4,
    base_price_cents: 5500_00, city: 'Bengaluru', lat: 12.9352, lng: 77.6245,
    hero: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1600&q=80',
    ],
    features: ['ABS', '6 airbags', 'Apple CarPlay', 'Lane assist'],
  },
  {
    make: 'Tata', model: 'Nexon EV', year: 2024, category: 'ev',
    transmission: 'automatic', fuel_type: 'electric', seats: 5, luggage: 3,
    base_price_cents: 4000_00, city: 'Mumbai', lat: 19.0760, lng: 72.8777,
    hero: 'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?auto=format&fit=crop&w=1600&q=80',
    gallery: [],
    features: ['Fast charging', 'Connected car', 'Regenerative braking'],
  },
  {
    make: 'Mahindra', model: 'Thar', year: 2023, category: 'suv',
    transmission: 'manual', fuel_type: 'diesel', seats: 4, luggage: 2,
    base_price_cents: 6500_00, city: 'Goa', lat: 15.2993, lng: 74.1240,
    hero: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1600&q=80',
    gallery: [],
    features: ['4x4', 'Convertible top', 'Off-road tyres'],
  },
  {
    make: 'BMW', model: '3 Series', year: 2023, category: 'luxury',
    transmission: 'automatic', fuel_type: 'petrol', seats: 5, luggage: 3,
    base_price_cents: 12500_00, city: 'Delhi', lat: 28.6139, lng: 77.2090,
    hero: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1600&q=80',
    gallery: [],
    features: ['Leather seats', 'Heads-up display', 'Premium sound'],
  },
  {
    make: 'Maruti', model: 'Swift', year: 2023, category: 'hatchback',
    transmission: 'manual', fuel_type: 'petrol', seats: 5, luggage: 2,
    base_price_cents: 2500_00, city: 'Bengaluru', lat: 12.9279, lng: 77.6271,
    hero: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1600&q=80',
    gallery: [],
    features: ['Bluetooth', 'Power steering', 'AC'],
  },
];

(async () => {
  console.log('Seeding users…');
  const hash = await bcrypt.hash('password123', 10);
  await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role, kyc_verified, wallet_cents)
     VALUES
       ('demo@user.com',  $1, 'Demo Renter', 'user',  TRUE, 5000000),
       ('demo@owner.com', $1, 'Demo Owner',  'owner', TRUE, 0),
       ('admin@demo.com', $1, 'Admin',       'admin', TRUE, 0)
     ON CONFLICT (email) DO NOTHING`,
    [hash]
  );

  const owner = (
    await pool.query(`SELECT id FROM users WHERE email='demo@owner.com'`)
  ).rows[0];

  console.log('Seeding cars…');
  for (const c of cars) {
    await pool.query(
      `INSERT INTO cars (owner_id, make, model, year, category, transmission, fuel_type,
                         seats, luggage, base_price_cents, current_price_cents,
                         city, lat, lng, hero_image_url, gallery, features)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb)
       ON CONFLICT DO NOTHING`,
      [
        owner.id, c.make, c.model, c.year, c.category, c.transmission,
        c.fuel_type, c.seats, c.luggage, c.base_price_cents,
        c.city, c.lat, c.lng, c.hero,
        JSON.stringify(c.gallery), JSON.stringify(c.features),
      ]
    );
  }

  console.log('Seed complete.');
  await pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
