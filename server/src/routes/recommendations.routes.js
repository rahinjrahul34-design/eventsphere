const router = require('express').Router();
const { optionalAuth, requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/recommendationController');

// Primary recommendation feeds
router.get('/', optionalAuth, ctrl.getRecommendedList);
router.get('/feed', optionalAuth, ctrl.getFeed);
router.get('/home', optionalAuth, ctrl.getFeed);
router.get('/similar/:eventId', ctrl.getSimilar);
router.get('/trending', optionalAuth, ctrl.getTrending);
router.get('/nearby', optionalAuth, ctrl.getNearby);
router.get('/explore', optionalAuth, ctrl.getExplore);

// Explanations (dual routes for flexible API consumption)
router.get('/explanation/:eventId', optionalAuth, ctrl.getExplanation);
router.get('/:eventId/explanation', optionalAuth, ctrl.getExplanation);

// Behavioral tracking & feedback
router.post('/interaction', optionalAuth, ctrl.trackInteraction);
router.post('/feedback', requireAuth, ctrl.submitFeedback);
router.post('/:eventId/feedback', requireAuth, ctrl.submitFeedback);

// Admin oversight
router.get('/analytics', requireAuth, ctrl.getAnalytics);

module.exports = router;
