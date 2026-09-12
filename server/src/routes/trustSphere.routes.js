const router = require('express').Router();
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/trustSphereController');

// Public endpoints (optionalAuth for viewer-role based privacy scoping)
router.get('/organizers/:organizerId', optionalAuth, ctrl.getOrganizerTrust);
router.get('/organizers/:organizerId/history', optionalAuth, ctrl.getOrganizerTrustHistory);
router.get('/events/:eventId/organizer', optionalAuth, ctrl.getEventOrganizerTrust);

// Organizer private dashboard endpoints
router.get('/me', requireAuth, requireRole('organizer', 'admin'), ctrl.getMyTrust);
router.get('/me/ai-insights', requireAuth, requireRole('organizer', 'admin'), ctrl.getMyAiInsights);
router.post('/me/simulate', requireAuth, requireRole('organizer', 'admin'), ctrl.simulateTrust);
router.post('/me/recalculate', requireAuth, requireRole('organizer', 'admin'), ctrl.recalculateMyTrust);

// Admin platform analytics
router.get('/admin/analytics', requireAuth, requireRole('admin'), ctrl.getAdminTrustAnalytics);

module.exports = router;
