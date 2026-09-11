const router = require('express').Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const g = require('../controllers/gamificationController');

router.get('/me', requireAuth, g.myProfile);
router.get('/leaderboard', optionalAuth, g.leaderboard);
router.get('/events/:id/leaderboard', optionalAuth, g.attendeeOfEvent);

module.exports = router;
