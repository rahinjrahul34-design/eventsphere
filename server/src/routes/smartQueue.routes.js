const express = require('express');
const router = express.Router({ mergeParams: true });
const smartQueueController = require('../controllers/smartQueueController');
const { requireAuth } = require('../middleware/auth');
const { smartQueueActionLimiter } = require('../middleware/rateLimit');

// Attendee endpoints (action-limited — CORE FEATURE 41)
router.get('/hold', requireAuth, smartQueueController.getActiveHold);
router.post('/hold/accept', requireAuth, smartQueueActionLimiter, smartQueueController.acceptHold);
router.post('/hold/decline', requireAuth, smartQueueActionLimiter, smartQueueController.declineHold);

// Organizer / Admin endpoints
router.get('/metrics', requireAuth, smartQueueController.getMetrics);
router.get('/ai-insights', requireAuth, smartQueueController.getAiInsights);
router.post('/simulate', requireAuth, smartQueueController.simulate);
router.post('/manual-promote', requireAuth, smartQueueActionLimiter, smartQueueController.manualPromote);
router.put('/settings', requireAuth, smartQueueController.updateSettings);

module.exports = router;
