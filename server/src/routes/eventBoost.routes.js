const router = require('express').Router({ mergeParams: true });
const { requireAuth } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');
const ctrl = require('../controllers/eventBoostController');

// All EventBoost routes require authentication
router.use(requireAuth);

// Core SEO profile & deterministic analysis
router.get('/', ctrl.getSEO);
router.post('/analyze', ctrl.analyze);

// AI-driven suggestions & optimizations (rate-limited)
router.post('/optimize', aiLimiter, ctrl.optimize);

// Apply selected optimizations
router.post('/apply', ctrl.apply);

// Conversational SEO Copilot
router.post('/copilot', aiLimiter, ctrl.copilot);

// History & audit log
router.get('/history', ctrl.getHistory);

module.exports = router;
