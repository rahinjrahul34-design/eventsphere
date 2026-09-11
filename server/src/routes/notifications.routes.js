const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const n = require('../controllers/notificationController');

router.get('/', requireAuth, n.list);
router.post('/read-all', requireAuth, n.markAllRead);
router.post('/:id/read', requireAuth, n.markRead);

module.exports = router;
