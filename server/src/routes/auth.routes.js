const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const {
  authLimiter,
  forgotPasswordLimiter,
  resendOtpLimiter,
  verifyOtpLimiter,
  resetPasswordLimiter,
} = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const {
  forgotPasswordSchema,
  resendOtpSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} = require('../validations/auth.validation');
const ctrl = require('../controllers/authController');

router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);
router.post('/google', authLimiter, ctrl.googleLogin);
router.get('/me', requireAuth, ctrl.me);
router.patch('/me', requireAuth, ctrl.updateMe);
router.put('/me', requireAuth, ctrl.updateMe);
router.post('/change-password', requireAuth, ctrl.changePassword);

// Secure Password Reset Flow
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post('/resend-otp', resendOtpLimiter, validate(resendOtpSchema), ctrl.resendOtp);
router.post('/verify-otp', verifyOtpLimiter, validate(verifyOtpSchema), ctrl.verifyOtp);
router.post('/reset-password', resetPasswordLimiter, validate(resetPasswordSchema), ctrl.resetPassword);

router.post('/apply-organizer', requireAuth, ctrl.applyOrganizer);

module.exports = router;

