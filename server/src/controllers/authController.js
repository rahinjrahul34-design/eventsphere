const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
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
    organizerStatus: allowedRole === 'organizer' ? 'pending' : 'none',
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

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() }).select('+resetPasswordToken +resetPasswordExpire');
  if (!user) {
    // Don't leak account existence
    return ok(res, { sent: true });
  }
  const raw = crypto.randomBytes(24).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(raw).digest('hex');
  user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  const link = `${config.clientUrl}/reset-password?token=${raw}`;
  const tpl = emailService.templates.resetPassword(user.name, link);
  await emailService.sendEmail({ to: user.email, ...tpl });

  ok(res, { sent: true, ...(config.demoMode ? { demoResetLink: `/reset-password?token=${raw}` } : {}) });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) throw ApiError.badRequest('Token and new password are required');
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpire: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpire');
  if (!user) throw ApiError.badRequest('Reset link is invalid or expired');
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  tokenPayload(user, 200, res);
});

const applyOrganizer = asyncHandler(async (req, res) => {
  const { organization = '', reason = '' } = req.body;
  if (req.user.organizerStatus === 'approved') throw ApiError.badRequest('You are already an approved organizer');
  req.user.role = 'organizer';
  req.user.organizerStatus = 'pending';
  req.user.organizerApplication = { organization, reason, appliedAt: new Date() };
  await req.user.save();
  await notificationService.notify({
    user: req.user._id,
    type: 'system',
    title: 'Organizer application submitted',
    message: 'An administrator will review your application shortly.',
  });
  created(res, req.user.toSafeJSON());
});

module.exports = {
  register, login, googleLogin, me, updateMe, changePassword, forgotPassword, resetPassword, applyOrganizer,
};
