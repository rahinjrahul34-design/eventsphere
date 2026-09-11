const router = require('express').Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const f = require('../controllers/feedbackController');

router.get('/events/:id/feedback', optionalAuth, f.eventFeedback);
router.post('/events/:id/feedback', requireAuth, f.submitFeedback);

module.exports = router;
