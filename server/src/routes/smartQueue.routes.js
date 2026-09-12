const express = require('express');
const router = express.Router({ mergeParams: true });
const smartQueueController = require('../controllers/smartQueueController');
const { requireAuth } = require('../middleware/auth');

// Attendee endpoints
router.get('/hold', requireAuth, smartQueueController.getActiveHold);
router.post('/hold/accept', requireAuth, smartQueueController.acceptHold);
router.post('/hold/decline', requireAuth, smartQueueController.declineHold);

// Organizer / Admin endpoints
router.get('/metrics', requireAuth, smartQueueController.getMetrics);
router.get('/ai-insights', requireAuth, smartQueueController.getAiInsights);
router.post('/simulate', requireAuth, smartQueueController.simulate);
router.post('/manual-promote', requireAuth, smartQueueController.manualPromote);
router.put('/settings', requireAuth, smartQueueController.updateSettings);

module.exports = router;
