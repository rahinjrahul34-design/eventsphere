const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const reg = require('../controllers/registrationController');

router.get('/mine', requireAuth, reg.myRegistrations);
router.post('/:id/cancel', requireAuth, reg.cancelRegistration);

module.exports = router;
