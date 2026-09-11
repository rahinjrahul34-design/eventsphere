const router = require('express').Router();
const { requireAuth, requireApprovedOrganizer } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');
const ai = require('../controllers/aiController');

router.post('/plan', requireAuth, requireApprovedOrganizer, aiLimiter, ai.plan);
router.post('/generate', requireAuth, requireApprovedOrganizer, aiLimiter, ai.generate);
router.get('/insights/:eventId', requireAuth, ai.insights);
router.get('/recommendations', requireAuth, ai.recommendations);

module.exports = router;
