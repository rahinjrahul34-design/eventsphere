const router = require('express').Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const n = require('../controllers/networkingController');

router.get('/networking/suggestions', requireAuth, n.suggestions);
router.get('/networking/connections', requireAuth, n.listConnections);
router.post('/networking/:id/connect', requireAuth, n.requestConnection);
router.post('/networking/connections/:id/respond', requireAuth, n.respondConnection);

router.get('/users/:id', optionalAuth, n.publicProfile);

router.get('/messages/threads', requireAuth, n.dmList);
router.get('/messages/dm/:userId', requireAuth, n.dmHistory);
router.post('/messages/dm/:userId', requireAuth, n.sendDM);

module.exports = router;
