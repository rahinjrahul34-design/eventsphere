const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const reg = require('../controllers/registrationController');

router.post('/verify', requireAuth, reg.verifyPayment);

module.exports = router;
