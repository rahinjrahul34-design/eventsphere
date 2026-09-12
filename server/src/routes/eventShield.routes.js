const router = require('express').Router({ mergeParams: true });
const { requireAuth } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');
const ctrl = require('../controllers/eventShieldController');

// All EventShield routes require authentication
router.use(requireAuth);

// Core Risk Assessment
router.get('/', ctrl.getAssessment);
router.post('/analyze', aiLimiter, ctrl.analyzeEvent);

// What-If Simulator
router.post('/simulate', ctrl.simulate);

// Risk Score History
router.get('/history', ctrl.getHistory);

// Dynamic Safety Checklist
router.get('/checklist', ctrl.getChecklist);
router.patch('/checklist', ctrl.updateChecklistItem);

// Realtime Operational Alerts
router.get('/alerts', ctrl.getAlerts);
router.patch('/alerts/:alertId/resolve', ctrl.resolveAlert);

// Audit Report Export
router.get('/report', ctrl.getReport);

// Safety Configuration
router.put('/safety-config', ctrl.updateSafetyConfig);

module.exports = router;
