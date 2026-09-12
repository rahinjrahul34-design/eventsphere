const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created } = require('../utils/response');
const emailService = require('../services/emailService');
const notificationService = require('../services/notificationService');
const config = require('../config');

const googleClient = new OAuth2Client(config.google.clientId || '');

const tokenPayload = (user, statusCode, res, extra = {}) => {
  const token = user.signToken();
  return res.status(statusCode).json({
    success: true,
    data: { token, user: user.toSafeJSON() },
    ...extra,
  });
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'attendee', interests = [] } = req.body;
  if (!name || !email || !password) throw ApiError.badRequest('Name, email and password are required');
  if (password.length < 6) throw ApiError.badRequest('Password must be at least 6 characters');
  if (await User.findOne({ email: email.toLowerCase() })) throw ApiError.conflict('An account with this email already exists');

  const allowedRole = ['attendee', 'organizer', 'volunteer', 'speaker'].includes(role) ? role : 'attendee';
  const user = await User.create({
    name,
    email,
    password,
    role: allowedRole,
    interests,
    organizerStatus: allowedRole === 'organizer' ? 'approved' : 'none',
    onboardingCompleted: interests.length > 0,
  });

  await notificationService.notify({
    user: user._id,
    type: 'system',
    title: 'Welcome to EventSphere! 🎉',
    message: 'Discover events, build connections and earn badges.',
    link: '/events',
  });

  tokenPayload(user, 201, res);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw ApiError.badRequest('Email and password are required');

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid email or password');
  if (user.authProvider !== 'local' || !user.password) throw ApiError.unauthorized('This account uses Google sign-in. Please use "Continue with Google".');
  if (!(await user.matchPassword(password))) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('This account has been suspended. Please contact support.');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  tokenPayload(user, 200, res);
});

const googleLogin = asyncHandler(async (req, res) => {
  const { credential, idToken } = req.body;
  const googleToken = credential || idToken;

  if (!googleToken) throw ApiError.badRequest('Google credential is required');
  if (!config.google.clientId) throw ApiError.badRequest('Google sign-in is not configured. Add GOOGLE_CLIENT_ID to your server/.env file.');

  const ticket = await googleClient.verifyIdToken({
    idToken: googleToken,
    audience: config.google.clientId,
  });
  const payload = ticket.getPayload();

  if (!payload || !payload.email) throw ApiError.badRequest('Google account email is missing');

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ email });

  if (!user) {
    const baseName = payload.name || payload.email.split('@')[0];
    user = await User.create({
      name: baseName,
      email,
      password: crypto.randomBytes(18).toString('hex'),
      avatar: payload.picture || '',
      authProvider: 'google',
      googleId: payload.sub,
      role: 'attendee',
      onboardingCompleted: false,
    });
  } else {
    user.authProvider = user.authProvider || 'google';
    user.googleId = user.googleId || payload.sub;
    user.name = user.name || payload.name || 'Google User';
    user.avatar = user.avatar || payload.picture || '';
    if (!user.isActive) throw ApiError.forbidden('This account has been suspended. Please contact support.');
    await user.save({ validateBeforeSave: false });
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  tokenPayload(user, 200, res);
});

const me = asyncHandler(async (req, res) => {
  ok(res, req.user.toSafeJSON());
});

const updateMe = asyncHandler(async (req, res) => {
  const fields = [
    'name', 'avatar', 'title', 'company', 'bio', 'phone', 'location', 'website',
    'interests', 'skills', 'networkingGoal', 'networkingOpen', 'social',
    'onboardingCompleted',
  ];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) req.user[f] = req.body[f];
  });
  await req.user.save();
  ok(res, req.user.toSafeJSON());
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) throw ApiError.badRequest('Current password is incorrect');
  if (!newPassword || newPassword.length < 6) throw ApiError.badRequest('New password must be at least 6 characters');
  user.password = newPassword;
  await user.save();
  ok(res, { changed: true });
});

// Constant-time dummy hash calculation to neutralize email enumeration via timing discrepancies
async function dummyHashWork() {
  if (process.env.NODE_ENV === 'test') return;
  const dummySalt = crypto.randomBytes(16).toString('hex');
  crypto.pbkdf2Sync('dummy_timing_mitigation_secret', dummySalt, 1000, 32, 'sha256');
}

const GENERIC_FORGOT_SUCCESS =
  'If an account exists with this email, a verification code has been sent.';

const forgotPassword = asyncHandler(async (req, res) => {
  const email = req.body.email?.toLowerCase().trim();
  const user = await User.findOne({ email });

  if (!user || !user.isActive) {
    // Perform dummy work to mitigate timing-based account enumeration
    await dummyHashWork();
    return res.status(200).json({
      success: true,
      message: GENERIC_FORGOT_SUCCESS,
      data: { message: GENERIC_FORGOT_SUCCESS },
    });
  }

  // Check if an unverified OTP was generated recently (respect 60-second resend cooldown)
  const existingPending = await PasswordReset.findOne({
    userId: user._id,
    isUsed: false,
    verifiedAt: null,
  }).sort({ createdAt: -1 });

  const cooldownSecs = config.otp?.resendCooldownSeconds || 60;
  if (existingPending && existingPending.lastSentAt) {
    const elapsedSecs = Math.floor((Date.now() - new Date(existingPending.lastSentAt).getTime()) / 1000);
    if (elapsedSecs < cooldownSecs) {
      // Return generic success to avoid leaking account existence, but do not spam emails
      return res.status(200).json({
        success: true,
        message: GENERIC_FORGOT_SUCCESS,
        data: { message: GENERIC_FORGOT_SUCCESS },
      });
    }
  }

  // Invalidate any existing unused reset records for this user
  await PasswordReset.deleteMany({ userId: user._id });

  // Generate cryptographically secure random 6-digit OTP (000000 - 999999)
  const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

  const expiryMinutes = config.otp?.expiryMinutes || 10;
  const otpExpiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  const expiresAt = new Date(Date.now() + (expiryMinutes + 15) * 60 * 1000); // TTL cleanup buffer

  await PasswordReset.create({
    userId: user._id,
    email: user.email,
    otpHash,
    otpExpiresAt,
    otpAttempts: 0,
    lastSentAt: new Date(),
    expiresAt,
  });

  const tpl = emailService.templates.passwordResetOtp(user.name, otp, expiryMinutes);
  await emailService.sendEmail({ to: user.email, ...tpl });

  console.log(`[AUTH SECURITY] Password reset OTP requested for user ID: ${user._id}`);

  return res.status(200).json({
    success: true,
    message: GENERIC_FORGOT_SUCCESS,
    data: {
      message: GENERIC_FORGOT_SUCCESS,
      ...(config.demoMode ? { demoOtp: otp } : {}),
    },
    ...(config.demoMode ? { demoOtp: otp } : {}),
  });
});

const resendOtp = asyncHandler(async (req, res) => {
  const email = req.body.email?.toLowerCase().trim();
  const user = await User.findOne({ email });

  if (!user || !user.isActive) {
    await dummyHashWork();
    return res.status(200).json({
      success: true,
      message: GENERIC_FORGOT_SUCCESS,
      data: { message: GENERIC_FORGOT_SUCCESS },
    });
  }

  const existingPending = await PasswordReset.findOne({
    userId: user._id,
    isUsed: false,
    verifiedAt: null,
  }).sort({ createdAt: -1 });

  const cooldownSecs = config.otp?.resendCooldownSeconds || 60;
  if (existingPending && existingPending.lastSentAt) {
    const elapsedSecs = Math.floor((Date.now() - new Date(existingPending.lastSentAt).getTime()) / 1000);
    if (elapsedSecs < cooldownSecs) {
      const waitTime = cooldownSecs - elapsedSecs;
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another code.',
        retryAfter: waitTime,
      });
    }
  }

  // Invalidate previous OTP immediately
  await PasswordReset.deleteMany({ userId: user._id });

  // Generate NEW OTP
  const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

  const expiryMinutes = config.otp?.expiryMinutes || 10;
  const otpExpiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  const expiresAt = new Date(Date.now() + (expiryMinutes + 15) * 60 * 1000);

  await PasswordReset.create({
    userId: user._id,
    email: user.email,
    otpHash,
    otpExpiresAt,
    otpAttempts: 0,
    lastSentAt: new Date(),
    expiresAt,
  });

  const tpl = emailService.templates.passwordResetOtp(user.name, otp, expiryMinutes);
  await emailService.sendEmail({ to: user.email, ...tpl });

  console.log(`[AUTH SECURITY] New OTP generated and resent for user ID: ${user._id}`);

  return res.status(200).json({
    success: true,
    message: GENERIC_FORGOT_SUCCESS,
    data: {
      message: GENERIC_FORGOT_SUCCESS,
      ...(config.demoMode ? { demoOtp: otp } : {}),
    },
    ...(config.demoMode ? { demoOtp: otp } : {}),
  });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const email = req.body.email?.toLowerCase().trim();
  const otp = req.body.otp?.trim();

  const user = await User.findOne({ email });
  if (!user || !user.isActive) {
    await dummyHashWork();
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired verification code.',
    });
  }

  const record = await PasswordReset.findOne({
    userId: user._id,
    isUsed: false,
    verifiedAt: null,
  }).select('+otpHash');

  if (!record || !record.otpHash) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired verification code.',
    });
  }

  // Check if OTP has expired
  if (new Date() > new Date(record.otpExpiresAt)) {
    await PasswordReset.deleteOne({ _id: record._id });
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired verification code.',
    });
  }

  const maxAttempts = config.otp?.maxAttempts || 5;

  // Check if attempts exceeded maximum
  if (record.otpAttempts >= maxAttempts) {
    await PasswordReset.deleteOne({ _id: record._id });
    console.warn(`[AUTH SECURITY] User ID ${user._id} exceeded max verification attempts.`);
    return res.status(400).json({
      success: false,
      message: 'Too many verification attempts. Please request a new code.',
    });
  }

  // Constant-time comparison between stored SHA-256 hash and submitted OTP hash
  const submittedHash = crypto.createHash('sha256').update(otp).digest('hex');
  const storedHashBuf = Buffer.from(record.otpHash, 'hex');
  const submittedHashBuf = Buffer.from(submittedHash, 'hex');

  let hashMatches = false;
  if (storedHashBuf.length === submittedHashBuf.length) {
    hashMatches = crypto.timingSafeEqual(storedHashBuf, submittedHashBuf);
  }

  if (!hashMatches) {
    record.otpAttempts += 1;
    if (record.otpAttempts >= maxAttempts) {
      await PasswordReset.deleteOne({ _id: record._id });
      console.warn(`[AUTH SECURITY] Max OTP attempts reached for user ID: ${user._id}. Record invalidated.`);
      return res.status(400).json({
        success: false,
        message: 'Too many verification attempts. Please request a new code.',
      });
    }
    await record.save();
    console.warn(`[AUTH SECURITY] Failed OTP verification attempt (${record.otpAttempts}/${maxAttempts}) for user ID: ${user._id}`);
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired verification code.',
    });
  }

  // OTP verified successfully: issue a cryptographically random, short-lived reset token
  const rawResetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
  const tokenExpiryMinutes = config.otp?.resetTokenExpiryMinutes || 15;
  const resetTokenExpiresAt = new Date(Date.now() + tokenExpiryMinutes * 60 * 1000);

  // Invalidate OTP completely so it can never be verified again
  record.otpHash = undefined;
  record.otpExpiresAt = new Date(0);
  record.verifiedAt = new Date();
  record.resetTokenHash = resetTokenHash;
  record.resetTokenExpiresAt = resetTokenExpiresAt;
  record.expiresAt = resetTokenExpiresAt;
  await record.save();

  console.log(`[AUTH SECURITY] OTP successfully verified for user ID: ${user._id}. Issued reset session.`);

  return res.status(200).json({
    success: true,
    resetToken: rawResetToken,
    data: { resetToken: rawResetToken },
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Passwords do not match',
    });
  }

  const tokenHash = crypto.createHash('sha256').update(resetToken.trim()).digest('hex');
  const record = await PasswordReset.findOne({
    resetTokenHash: tokenHash,
  }).select('+resetTokenHash');

  if (
    !record ||
    record.isUsed ||
    !record.resetTokenExpiresAt ||
    new Date() > new Date(record.resetTokenExpiresAt)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Password reset session is invalid or expired.',
    });
  }

  const user = await User.findById(record.userId).select('+password');
  if (!user || !user.isActive) {
    return res.status(400).json({
      success: false,
      message: 'Password reset session is invalid or expired.',
    });
  }

  // Single-use protection: mark record as used immediately
  record.isUsed = true;
  await record.save();

  // Update password — userSchema.pre('save') hashes with bcrypt cost factor 10
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  // Invalidate all remaining reset sessions for this user
  await PasswordReset.deleteMany({ userId: user._id });

  console.log(`[AUTH SECURITY] Password successfully reset for user ID: ${user._id}`);

  return res.status(200).json({
    success: true,
    message: 'Password reset successfully.',
    data: { message: 'Password reset successfully.' },
  });
});

const applyOrganizer = asyncHandler(async (req, res) => {
  const { organization = '', reason = '' } = req.body;
  if (req.user.organizerStatus === 'approved' && req.user.role === 'organizer') {
    throw ApiError.badRequest('You are already an approved organizer');
  }
  req.user.role = 'organizer';
  req.user.organizerStatus = 'approved';
  req.user.organizerApplication = { organization, reason, appliedAt: new Date() };
  await req.user.save();
  await notificationService.notify({
    user: req.user._id,
    type: 'system',
    title: 'Organizer status activated 🎉',
    message: 'You can now create and manage events on EventSphere.',
  });
  created(res, req.user.toSafeJSON());
});

module.exports = {
  register,
  login,
  googleLogin,
  me,
  updateMe,
  changePassword,
  forgotPassword,
  resendOtp,
  verifyOtp,
  resetPassword,
  applyOrganizer,
};

