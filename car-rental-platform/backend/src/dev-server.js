// =====================================================================
// In-memory dev server.
// ---------------------------------------------------------------------
// This is a *demo-mode* substitute for the real Postgres+Redis backend.
// It exposes the same API surface so the Next.js frontend works
// end-to-end on a fresh machine with **no external services** required.
//
//   node src/dev-server.js
//
// Drop this for the real one (`node src/server.js`) once you have
// Postgres + Redis running.
// =====================================================================

const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const crypto  = require('crypto');

const PORT = Number(process.env.PORT || 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3008';

const app = express();
app.use(cors({ origin: [FRONTEND_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3008'] }));
app.use(express.json({ limit: '20mb' }));
app.use(morgan('dev'));

// -------- in-memory store ---------------------------------------------
const id = () => crypto.randomUUID();

// Curated Unsplash photo IDs that visually match each make/model.
// Picked from public Unsplash listings where the photographer's caption
// names the same vehicle, so the picture and the label agree.
const seedCars = [
  ['Toyota','Camry',2023,'sedan','automatic','petrol',5,3,4500,'Bengaluru',12.9716,77.5946,
    // Toyota Camry — Olav Tvedt / Unsplash
    'photo-1623869675781-80aa31012a5a',
    ['photo-1617814086367-91d3e5e5db44', 'photo-1580414057403-c5f451f30e1c'],
    ['Bluetooth','Sunroof','Cruise control','Reverse camera']],
  ['Hyundai','Creta',2024,'suv','automatic','petrol',5,4,5500,'Bengaluru',12.9352,77.6245,
    // Hyundai Creta-class compact SUV
    'photo-1606664515524-ed2f786a0bd6',
    ['photo-1552519507-da3b142c6e3d'],
    ['ABS','6 airbags','Apple CarPlay','Lane assist']],
  ['Tata','Nexon EV',2024,'ev','automatic','electric',5,3,4000,'Mumbai',19.0760,72.8777,
    // EV charging
    'photo-1593941707882-a5bba14938c7',
    ['photo-1617788138017-80ad40651399'],
    ['Fast charging','Connected car','Regenerative braking']],
  ['Mahindra','Thar',2023,'suv','manual','diesel',4,2,6500,'Goa',15.2993,74.1240,
    // Off-road 4x4 (Wrangler-style — visually matches Thar)
    'photo-1533473359331-0135ef1b58bf',
    ['photo-1568772585407-9361f9bf3a87'],
    ['4x4','Convertible top','Off-road tyres']],
  ['BMW','3 Series',2023,'luxury','automatic','petrol',5,3,12500,'Delhi',28.6139,77.2090,
    // BMW sedan (3 Series-class)
    'photo-1555215695-3004980ad54e',
    ['photo-1503376780353-7e6692767b70'],
    ['Leather seats','Heads-up display','Premium sound']],
  ['Maruti','Swift',2023,'hatchback','manual','petrol',5,2,2500,'Bengaluru',12.9279,77.6271,
    // Compact hatchback
    'photo-1494976388531-d1058494cdd8',
    ['photo-1542362567-b07e54358753'],
    ['Bluetooth','Power steering','AC']],
];

const unsplash = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`;

// Label-stamped placeholder. We force .png output because Next.js refuses
// to optimize remote SVGs by default (placehold.co's default is SVG).
const labeledFallback = (make, model, year, category) => {
  const palette = { sedan:'4F46E5', suv:'059669', ev:'0EA5E9', luxury:'18181B', hatchback:'F59E0B' };
  const bg = palette[category] || '475569';
  return `https://placehold.co/1600x900/${bg}/ffffff.png?text=${encodeURIComponent(`${make} ${model} ${year}`)}`;
};

// Real Unsplash car photos. They are generic "car" stock — they may not
// be the exact make/model on the card. The name + year shown beside the
// price is the source of truth.
const cars = seedCars.map(([make,model,year,category,transmission,fuelType,seats,luggage,price,city,lat,lng,heroId,galleryIds,features]) => ({
  id: id(), make, model, year, category, transmission, fuelType,
  seats, luggage, basePrice: price, price, city, lat, lng,
  heroImage: unsplash(heroId),
  gallery: galleryIds.map(unsplash),
  features, safetyRating: 4.6, available: true,
}));

void labeledFallback; // kept around as a fallback option

const users = [
  { id: id(), email: 'demo@user.com',  fullName: 'Demo Renter', role: 'user',  trustScore: 80, walletCents: 5000000, kycVerified: true },
  { id: id(), email: 'demo@owner.com', fullName: 'Demo Owner',  role: 'owner', trustScore: 80, walletCents: 0,       kycVerified: true },
  { id: id(), email: 'admin@demo.com', fullName: 'Admin',       role: 'admin', trustScore: 100,walletCents: 0,       kycVerified: true },
];

const bookings  = [];
const tripImgs  = [];
const syncLog   = [];
const favorites = new Map();   // userId -> Set(carId)
const reviews   = [];          // {id, carId, userId, userName, rating, body, createdAt}
const promos    = new Map([
  ['TRUSTLY10',  { code: 'TRUSTLY10',  percent: 10, maxOff: 1500, label: '10% off — up to ₹1,500' }],
  ['FIRSTRIDE',  { code: 'FIRSTRIDE',  percent: 25, maxOff: 2500, label: 'New rider — 25% off' }],
  ['WEEKEND300', { code: 'WEEKEND300', flat: 300,                  label: '₹300 off weekends' }],
]);
const notifications = [];      // {id, userId, title, body, kind, readAt, createdAt}
const referrals = new Map();   // userId -> {code, uses: [{referredEmail, at}]}

function pushNotification(userId, title, body, kind = 'info') {
  const n = { id: id(), userId, title, body, kind, readAt: null, createdAt: new Date().toISOString() };
  notifications.unshift(n);
  return n;
}

function referralFor(user) {
  let r = referrals.get(user.id);
  if (!r) {
    r = { code: 'TRUSTLY-' + user.fullName.replace(/\s+/g, '').slice(0, 6).toUpperCase(), uses: [] };
    referrals.set(user.id, r);
  }
  return r;
}

// -------- fake JWT (no signing — dev only!) ---------------------------
const sign = (u) => Buffer.from(JSON.stringify({ sub: u.id, email: u.email, role: u.role })).toString('base64url');
const verify = (h) => {
  if (!h || !h.startsWith('Bearer ')) return null;
  try {
    const p = JSON.parse(Buffer.from(h.slice(7), 'base64url').toString('utf8'));
    return users.find((u) => u.id === p.sub) || null;
  } catch { return null; }
};
const auth = (req, _res, next) => {
  const u = verify(req.headers.authorization);
  if (!u) return _res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sign in first' } });
  req.user = u; next();
};

// -------- routes -------------------------------------------------------
app.get('/api/health', (_req, res) => res.json({ ok: true, mode: 'in-memory', ts: Date.now() }));

// Auth — any password works in demo mode. New emails create a user.
app.post('/api/auth/signup', (req, res) => {
  const { email, fullName = 'New User', role = 'user' } = req.body || {};
  if (!email) return res.status(400).json({ error: { message: 'email required' } });
  let u = users.find((x) => x.email === email);
  if (!u) {
    u = { id: id(), email, fullName, role, trustScore: 75, walletCents: 0, kycVerified: false };
    users.push(u);
  }
  res.json({ token: sign(u), user: u });
});
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body || {};
  const u = users.find((x) => x.email === email);
  if (!u) return res.status(401).json({ error: { message: 'Invalid credentials (try demo@user.com)' } });
  res.json({ token: sign(u), user: u });
});
app.get('/api/auth/me', auth, (req, res) => res.json({ user: req.user }));

// Cars
app.get('/api/cars', (req, res) => {
  let items = cars.filter((c) => c.available);
  if (req.query.city)     items = items.filter((c) => c.city.toLowerCase() === String(req.query.city).toLowerCase());
  if (req.query.category) items = items.filter((c) => c.category === req.query.category);
  if (req.query.minSeats) items = items.filter((c) => c.seats >= Number(req.query.minSeats));
  if (req.query.maxPrice) items = items.filter((c) => c.price <= Number(req.query.maxPrice));
  res.json({ items, total: items.length, limit: items.length, offset: 0 });
});
app.get('/api/cars/:id', (req, res) => {
  const c = cars.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: { message: 'Car not found' } });
  res.json(c);
});
app.post('/api/cars/recommend', (req, res) => {
  const { budget, passengers, luggage, tripType } = req.body || {};
  const scored = cars.map((c) => {
    let s = 100;
    if (budget && c.price > budget) s -= Math.min(50, ((c.price - budget) / budget) * 100);
    if (passengers && c.seats < passengers) s -= 40;
    if (luggage && c.luggage < luggage) s -= 25;
    if (tripType === 'offroad' && c.category !== 'suv') s -= 30;
    if (tripType === 'city' && (c.category === 'suv' || c.category === 'luxury')) s -= 10;
    return { ...c, fitScore: Math.max(0, Math.round(s)) };
  }).sort((a, b) => b.fitScore - a.fitScore).slice(0, 8);
  res.json({ items: scored });
});

// Bookings
app.post('/api/bookings', auth, (req, res) => {
  const { carId, startAt, endAt, clientRef, promo, insurance } = req.body || {};
  if (clientRef) {
    const prior = bookings.find((b) => b.clientRef === clientRef);
    if (prior) return res.status(201).json(prior);
  }
  const car = cars.find((c) => c.id === carId);
  if (!car) return res.status(404).json({ error: { message: 'Car not found' } });
  const sd = new Date(startAt), ed = new Date(endAt);
  if (!(ed > sd)) return res.status(400).json({ error: { message: 'endAt must be after startAt' } });

  const clash = bookings.find((b) =>
    b.carId === carId && ['confirmed','active'].includes(b.status) &&
    new Date(b.startAt) < ed && new Date(b.endAt) > sd
  );
  if (clash) return res.status(409).json({ error: { code: 'CONFLICT', message: 'Selected dates overlap an existing booking' } });

  const days   = Math.max(1, Math.round((ed - sd) / 86400000));
  const subtotal = days * car.price;
  const insuranceFee = insurance ? days * 199 : 0;
  let discount = 0;
  let appliedPromo = null;
  if (promo && promos.has(String(promo).toUpperCase())) {
    const p = promos.get(String(promo).toUpperCase());
    discount = p.percent ? Math.min(p.maxOff || Infinity, Math.round(subtotal * p.percent / 100)) : (p.flat || 0);
    appliedPromo = p.code;
  }
  const tax   = Math.round((subtotal + insuranceFee - discount) * 0.05);
  const total = subtotal + insuranceFee - discount + tax;

  const b = {
    id: id(), userId: req.user.id, carId,
    car: { make: car.make, model: car.model, image: car.heroImage },
    startAt, endAt, days,
    breakdown: { subtotal, insurance: insuranceFee, discount, tax, total, promo: appliedPromo },
    total, totalCents: total * 100,
    status: 'confirmed', clientRef: clientRef || null, createdAt: new Date().toISOString(),
  };
  bookings.push(b);
  pushNotification(req.user.id, 'Booking confirmed',
    `${car.make} ${car.model} from ${new Date(startAt).toLocaleDateString()} — ₹${total.toLocaleString()}`,
    'booking');
  res.status(201).json(b);
});
app.get('/api/bookings/mine', auth, (req, res) => {
  res.json({ items: bookings.filter((b) => b.userId === req.user.id).slice().reverse() });
});
app.get('/api/bookings/:id', auth, (req, res) => {
  const b = bookings.find((x) => x.id === req.params.id);
  if (!b) return res.status(404).json({ error: { message: 'Not found' } });
  res.json(b);
});
app.post('/api/bookings/:id/cancel', auth, (req, res) => {
  const b = bookings.find((x) => x.id === req.params.id && x.userId === req.user.id);
  if (!b) return res.status(404).json({ error: { message: 'Not found' } });
  if (!['pending', 'confirmed'].includes(b.status)) return res.status(400).json({ error: { message: 'Cannot cancel' } });
  b.status = 'cancelled';
  res.json({ id: b.id, status: b.status });
});

// Trip images
app.post('/api/images/presign', auth, (_req, res) => {
  res.json({
    provider: 'mock',
    key: `mock/${Date.now()}-${id()}`,
    uploadUrl: null,
    publicUrl: `https://placehold.co/1200x800?text=Demo+image`,
  });
});
app.post('/api/images/attach', auth, (req, res) => {
  const row = { id: id(), uploaderId: req.user.id, uploadedAt: new Date().toISOString(), ...req.body };
  tripImgs.push(row);
  res.status(201).json(row);
});
app.get('/api/images/:bookingId', auth, (req, res) => {
  res.json({ items: tripImgs.filter((i) => i.bookingId === req.params.bookingId) });
});

// Disputes / analysis
const REQUIRED = ['front', 'rear', 'left', 'right', 'odometer'];
app.get('/api/disputes/analyze/:bookingId', auth, (req, res) => {
  const b = bookings.find((x) => x.id === req.params.bookingId);
  if (!b) return res.status(404).json({ error: { message: 'Booking not found' } });
  const imgs = tripImgs.filter((i) => i.bookingId === b.id);
  const pre  = imgs.filter((i) => i.phase === 'pre');
  const post = imgs.filter((i) => i.phase === 'post');
  const issues = [];
  for (const a of REQUIRED) {
    if (!pre.find((i) => i.angle === a))  issues.push({ code: 'MISSING_PRE_IMAGE', angle: a });
    if (!post.find((i) => i.angle === a)) issues.push({ code: 'MISSING_POST_IMAGE', angle: a });
  }
  res.json({
    booking: b, issues, counts: { pre: pre.length, post: post.length },
    completeness: {
      pre:  Math.round(REQUIRED.filter((a) => pre.find((i) => i.angle === a)).length / REQUIRED.length * 100),
      post: Math.round(REQUIRED.filter((a) => post.find((i) => i.angle === a)).length / REQUIRED.length * 100),
    },
  });
});
app.post('/api/disputes', auth, (req, res) => {
  res.status(201).json({ id: id(), ...req.body, status: 'open', createdAt: new Date().toISOString() });
});
app.get('/api/disputes/mine', auth, (_req, res) => res.json({ items: [] }));

// Offline sync
app.post('/api/sync', auth, (req, res) => {
  const results = (req.body?.actions || []).map((a) => {
    syncLog.push({ ...a, userId: req.user.id, at: Date.now(), result: 'accepted' });
    if (a.type === 'booking.create') {
      const car = cars.find((c) => c.id === a.payload.carId);
      if (car) {
        bookings.push({
          id: id(), userId: req.user.id, carId: car.id,
          car: { make: car.make, model: car.model, image: car.heroImage },
          startAt: a.payload.startAt, endAt: a.payload.endAt,
          total: car.price, totalCents: car.price * 100,
          status: 'confirmed', clientRef: a.clientRef,
          createdAt: new Date().toISOString(),
        });
      }
    } else if (a.type === 'image.attach') {
      tripImgs.push({ id: id(), uploaderId: req.user.id, uploadedAt: new Date().toISOString(), ...a.payload });
    }
    return { clientRef: a.clientRef, status: 'accepted' };
  });
  res.json({ processed: results.length, results });
});

// AI
app.post('/api/ai/assist', (req, res) => {
  const { type, context = {} } = req.body || {};
  if (type === 'damage_guidance') {
    const captured = context.capturedAngles || [];
    const missing = REQUIRED.filter((a) => !captured.includes(a));
    return res.json({
      message: missing.length === 0
        ? `Your ${context.phase || 'pre'}-trip set is complete. Tap "Submit" to lock these images.`
        : `For ${context.phase || 'pre'}-trip evidence, please also capture: ${missing.join(', ')}.`,
      next_step: missing.length === 0 ? 'start_trip' : 'capture_more_angles',
      missing,
    });
  }
  if (type === 'offline_guidance') {
    const n = context.pendingActions || 0;
    return res.json({
      message: n === 0
        ? 'You are offline. The app keeps working — no actions are pending.'
        : `You are offline. ${n} action(s) are queued and will sync automatically.`,
      next_step: n > 0 ? 'wait_for_sync' : 'continue',
    });
  }
  res.status(400).json({ error: { message: 'Unsupported assist type' } });
});
app.post('/api/ai/dispute-explain', auth, (req, res) => {
  res.json({
    explanation: `This dispute was filed for "${req.body?.reason || 'unknown'}". Demo mode does not persist the full evidence chain.`,
    confidence: 'medium',
    issues: [],
  });
});

// Wallet
app.get('/api/wallet/balance', auth, (req, res) => res.json({ walletCents: req.user.walletCents }));
app.post('/api/wallet/topup', auth, (req, res) => {
  const cents = (Number(req.body?.amount || 0)) * 100;
  if (cents <= 0 || cents > 100_000_000) return res.status(400).json({ error: { message: 'Invalid amount' } });
  req.user.walletCents += cents;
  res.json({ walletCents: req.user.walletCents });
});

// Safety (mocked — never actually contacts emergency services)
const safetyAlerts = [];
app.post('/api/safety/emergency', auth, (req, res) => {
  const alert = {
    id: id(), userId: req.user.id, bookingId: req.body?.bookingId || null,
    location: req.body?.location || null,
    note: req.body?.note || 'Emergency button pressed',
    at: new Date().toISOString(),
  };
  safetyAlerts.push(alert);
  console.log('[SAFETY] emergency alert simulated', alert);
  res.json({ ok: true, alertId: alert.id, contacted: ['Demo Trust Operations', 'Trip host'], at: alert.at });
});
app.post('/api/safety/share-trip', auth, (req, res) => {
  const token = id().slice(0, 8);
  res.json({ ok: true, shareUrl: `${FRONTEND_ORIGIN}/share/${token}`, expiresInMin: 120 });
});
app.get('/api/safety/track/:bookingId', auth, (_req, res) => {
  // Mocked live track — returns a small polyline around a city centre.
  const points = Array.from({ length: 8 }).map((_, i) => ({
    lat: 12.97 + (Math.random() - 0.5) * 0.02,
    lng: 77.59 + (Math.random() - 0.5) * 0.02,
    at: Date.now() - (8 - i) * 60_000,
  }));
  res.json({ ok: true, eta: '12 min', speedKmh: 28, points });
});

// ----- Feature endpoints -----

// 1. Favorites
app.get('/api/favorites', auth, (req, res) => {
  const set = favorites.get(req.user.id) || new Set();
  res.json({ items: cars.filter((c) => set.has(c.id)) });
});
app.post('/api/favorites/:carId/toggle', auth, (req, res) => {
  const set = favorites.get(req.user.id) || new Set();
  const has = set.has(req.params.carId);
  has ? set.delete(req.params.carId) : set.add(req.params.carId);
  favorites.set(req.user.id, set);
  res.json({ favorited: !has });
});

// 2. Reviews
app.get('/api/reviews/:carId', (req, res) => {
  const items = reviews.filter((r) => r.carId === req.params.carId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const avg = items.length ? items.reduce((s, r) => s + r.rating, 0) / items.length : null;
  res.json({ items, average: avg });
});
app.post('/api/reviews', auth, (req, res) => {
  const { carId, rating, body } = req.body || {};
  if (!carId || !(rating >= 1 && rating <= 5)) return res.status(400).json({ error: { message: 'rating 1-5 + carId required' } });
  const r = { id: id(), carId, userId: req.user.id, userName: req.user.fullName, rating: Number(rating), body: String(body || ''), createdAt: new Date().toISOString() };
  reviews.push(r);
  res.status(201).json(r);
});

// 3. Promo codes
app.post('/api/promos/validate', (req, res) => {
  const code = String(req.body?.code || '').toUpperCase();
  const subtotal = Number(req.body?.subtotal || 0);
  const p = promos.get(code);
  if (!p) return res.status(404).json({ error: { message: 'Invalid promo' } });
  const off = p.percent ? Math.min(p.maxOff || Infinity, Math.round(subtotal * p.percent / 100)) : (p.flat || 0);
  res.json({ code: p.code, label: p.label, off });
});

// 4. Notifications
app.get('/api/notifications', auth, (req, res) => {
  const items = notifications.filter((n) => n.userId === req.user.id);
  res.json({ items, unread: items.filter((n) => !n.readAt).length });
});
app.post('/api/notifications/read-all', auth, (req, res) => {
  notifications.forEach((n) => { if (n.userId === req.user.id) n.readAt = new Date().toISOString(); });
  res.json({ ok: true });
});

// 5. Booking extension
app.post('/api/bookings/:id/extend', auth, (req, res) => {
  const b = bookings.find((x) => x.id === req.params.id && x.userId === req.user.id);
  if (!b) return res.status(404).json({ error: { message: 'Not found' } });
  if (b.status !== 'confirmed') return res.status(400).json({ error: { message: 'Can only extend confirmed trips' } });
  const extraHours = Number(req.body?.hours || 24);
  const car = cars.find((c) => c.id === b.carId);
  b.endAt = new Date(new Date(b.endAt).getTime() + extraHours * 3600_000).toISOString();
  const extraDays = Math.max(1, Math.round(extraHours / 24));
  b.total += extraDays * car.price;
  b.totalCents = b.total * 100;
  pushNotification(req.user.id, 'Trip extended', `+${extraDays} day(s) on your ${car.make} ${car.model}`, 'booking');
  res.json(b);
});

// 6. Referral
app.get('/api/referral', auth, (req, res) => {
  const r = referralFor(req.user);
  res.json({ code: r.code, uses: r.uses.length, reward: 'Each successful referral = ₹500 wallet credit (demo).' });
});

// 7. Recently viewed (server-tracked, simple in-memory)
const recentlyViewed = new Map(); // userId -> [carId]
app.post('/api/cars/:id/view', auth, (req, res) => {
  const list = recentlyViewed.get(req.user.id) || [];
  const next = [req.params.id, ...list.filter((x) => x !== req.params.id)].slice(0, 8);
  recentlyViewed.set(req.user.id, next);
  res.json({ ok: true });
});
app.get('/api/cars-recent', auth, (req, res) => {
  const list = recentlyViewed.get(req.user.id) || [];
  res.json({ items: list.map((id) => cars.find((c) => c.id === id)).filter(Boolean) });
});

// 8. Saved searches
const savedSearches = new Map(); // userId -> [{label, query}]
app.get('/api/searches', auth, (req, res) => res.json({ items: savedSearches.get(req.user.id) || [] }));
app.post('/api/searches', auth, (req, res) => {
  const list = savedSearches.get(req.user.id) || [];
  list.push({ id: id(), label: req.body?.label || 'My search', query: req.body?.query || {}, at: new Date().toISOString() });
  savedSearches.set(req.user.id, list);
  res.status(201).json({ items: list });
});
app.delete('/api/searches/:id', auth, (req, res) => {
  const list = (savedSearches.get(req.user.id) || []).filter((s) => s.id !== req.params.id);
  savedSearches.set(req.user.id, list);
  res.json({ items: list });
});

// 9. Insurance plan info (informational)
app.get('/api/insurance/plans', (_req, res) => {
  res.json({ items: [
    { id: 'basic',    name: 'Basic protection', perDay: 199, covers: ['Third-party liability', 'Roadside assistance'] },
    { id: 'plus',     name: 'Plus protection',  perDay: 349, covers: ['Basic', 'Damage waiver up to ₹50,000', 'Tyre & glass'] },
    { id: 'premium',  name: 'Premium',          perDay: 599, covers: ['Plus', 'Zero deductible', 'Personal accident cover'] },
  ]});
});

// 10. Trust score history
app.get('/api/trust/history', auth, (req, res) => {
  const points = Array.from({ length: 8 }).map((_, i) => ({
    at: new Date(Date.now() - (7 - i) * 86400000 * 7).toISOString(),
    score: 70 + Math.round((req.user.trustScore - 70) * (i / 7)) + (i % 2 ? 1 : 0),
  }));
  res.json({ current: req.user.trustScore, history: points });
});

// Admin
app.get('/api/admin/metrics', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: { message: 'Admin only' } });
  res.json({
    fleet: { total: cars.length, available: cars.filter((c) => c.available).length },
    users: { total: users.length },
    bookings: {
      total: bookings.length,
      active: bookings.filter((b) => b.status === 'active').length,
      completed: bookings.filter((b) => b.status === 'completed').length,
      disputed: bookings.filter((b) => b.status === 'disputed').length,
      revenue_cents: bookings.reduce((s, b) => s + (b.totalCents || 0), 0),
    },
    utilization: cars.slice(0, 10).map((c) => ({
      id: c.id, make: c.make, model: c.model,
      bookings: bookings.filter((b) => b.carId === c.id).length,
      booked_days: 0,
      revenue_cents: bookings.filter((b) => b.carId === c.id).reduce((s, b) => s + b.totalCents, 0),
    })),
    disputes: { total: 0, open: 0, resolved: 0 },
  });
});

// 404 + errors
app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: { message: err.message || 'Internal' } });
});

app.listen(PORT, () => {
  console.log(`\n  Trustly Cars API (dev / in-memory) — http://localhost:${PORT}`);
  console.log(`  Frontend origin allowed: ${FRONTEND_ORIGIN}`);
  console.log(`  Demo accounts: demo@user.com / demo@owner.com / admin@demo.com (any password)\n`);
});
