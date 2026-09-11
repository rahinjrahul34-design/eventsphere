const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const a = require('../controllers/analyticsController');

router.get('/events/:id/analytics', requireAuth, a.eventStats);

module.exports = router;
