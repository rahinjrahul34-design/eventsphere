const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

// Verifies the Bearer JWT (or token cookie) and loads req.user from the DB.
async function requireAuth(req, res, next) {
  try {
    let token;
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) token = header.split(' ')[1];
    else if (req.cookies && req.cookies.token) token = req.cookies.token;

    if (!token) throw ApiError.unauthorized('Authentication required. Please log in.');

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (e) {
      throw ApiError.unauthorized('Session expired or invalid. Please log in again.');
    }

    const user = await User.findById(decoded.id);
    if (!user) throw ApiError.unauthorized('Account no longer exists.');
    if (!user.isActive) throw ApiError.forbidden('This account has been suspended.');

    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    next(err);
  }
}

// Auth that does NOT reject anonymous users (used on public endpoints with personalization).
async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    const token = header && header.startsWith('Bearer ') ? header.split(' ')[1] : null;
    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.id);
      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id;
      }
    }
  } catch (e) {
    /* ignore invalid token for public endpoint */
  }
  next();
}

const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`This action requires one of: ${roles.join(', ')}`));
    }
    next();
  };

// Organizers must be approved by an admin.
const requireApprovedOrganizer = (req, res, next) => {
  if (req.user.role === 'admin') return next();
  if (req.user.role !== 'organizer' || req.user.organizerStatus !== 'approved') {
    return next(ApiError.forbidden('Your organizer account is pending approval.'));
  }
  next();
};

module.exports = { requireAuth, optionalAuth, requireRole, requireApprovedOrganizer };
