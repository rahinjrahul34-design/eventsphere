const router = require('express').Router({ mergeParams: true });
const { requireAuth } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');
const ctrl = require('../controllers/eventPulseController');

// All EventPulse routes require authentication
router.use(requireAuth);

// Core Predictions
router.get('/', ctrl.getPrediction);
router.post('/analyze', aiLimiter, ctrl.recalculate);

// History & Timeline
router.get('/history', ctrl.getHistory);

// Post-Event Accuracy
router.get('/accuracy', ctrl.getAccuracy);

// Live Signals & Engagement
router.get('/live', ctrl.getLiveEngagement);

// What-If Scenario Simulator
router.post('/simulate', ctrl.simulate);

// Natural Language Query
router.post('/query', aiLimiter, ctrl.queryInsight);

module.exports = router;
