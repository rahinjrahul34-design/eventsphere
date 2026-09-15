const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const t = require('../controllers/ticketController');

router.get('/my', requireAuth, t.myTickets);
router.post('/validate', requireAuth, t.validateTicket);
router.get('/:idOrCode', requireAuth, t.getTicket);

module.exports = router;
