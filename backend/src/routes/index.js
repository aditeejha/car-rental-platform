const router = require('express').Router();
const { authRequired, requireRole } = require('../middleware/auth');

const auth     = require('../controllers/auth.controller');
const cars     = require('../controllers/car.controller');
const bookings = require('../controllers/booking.controller');
const images   = require('../controllers/image.controller');
const disputes = require('../controllers/dispute.controller');
const sync     = require('../controllers/sync.controller');
const ai       = require('../controllers/ai.controller');
const admin    = require('../controllers/admin.controller');
const wallet   = require('../controllers/wallet.controller');

router.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Auth
router.post('/auth/signup', auth.signup);
router.post('/auth/login',  auth.login);
router.get ('/auth/me',     authRequired, auth.me);

// Cars
router.get ('/cars',                       cars.list);
router.get ('/cars/:id',                   cars.get);
router.post('/cars/recommend',             cars.recommend);

// Bookings
router.post('/bookings',                   authRequired, bookings.create);
router.get ('/bookings/mine',              authRequired, bookings.mine);
router.get ('/bookings/:id',               authRequired, bookings.get);
router.post('/bookings/:id/cancel',        authRequired, bookings.cancel);

// Images / trip evidence
router.post('/images/presign',             authRequired, images.presign);
router.post('/images/attach',              authRequired, images.attach);
router.get ('/images/:bookingId',          authRequired, images.list);

// Disputes
router.post('/disputes',                   authRequired, disputes.raise);
router.get ('/disputes/mine',              authRequired, disputes.mine);
router.get ('/disputes/analyze/:bookingId',authRequired, disputes.analyze);

// Offline sync
router.post('/sync',                       authRequired, sync.process);

// AI
router.post('/ai/assist',                  ai.assist);
router.post('/ai/dispute-explain',         authRequired, ai.disputeExplain);

// Wallet
router.get ('/wallet/balance',             authRequired, wallet.balance);
router.post('/wallet/topup',               authRequired, wallet.topup);

// Admin
router.get ('/admin/metrics',              authRequired, requireRole('admin'), admin.metrics);

module.exports = router;
