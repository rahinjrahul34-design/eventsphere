const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const ctrl = require('../controllers/authController');

router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);
router.post('/google', authLimiter, ctrl.googleLogin);
router.get('/me', requireAuth, ctrl.me);
router.patch('/me', requireAuth, ctrl.updateMe);
router.put('/me', requireAuth, ctrl.updateMe);
router.post('/change-password', requireAuth, ctrl.changePassword);
router.post('/forgot-password', authLimiter, ctrl.forgotPassword);
router.post('/reset-password', authLimiter, ctrl.resetPassword);
router.post('/apply-organizer', requireAuth, ctrl.applyOrganizer);

module.exports = router;
