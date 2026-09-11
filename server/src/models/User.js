const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

const ROLES = ['attendee', 'organizer', 'volunteer', 'speaker', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: { type: String, minlength: 6, select: false },
    role: { type: String, enum: ROLES, default: 'attendee' },
    avatar: { type: String, default: '' },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, sparse: true, unique: true },
    title: { type: String, default: '' },
    company: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 600 },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    website: { type: String, default: '' },
    social: {
      linkedin: { type: String, default: '' },
      twitter: { type: String, default: '' },
      github: { type: String, default: '' },
    },
    // Personalization
    interests: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    networkingGoal: {
      type: String,
      enum: ['co-founder', 'job', 'internship', 'collaboration', 'mentorship', 'friends', ''],
      default: '',
    },
    networkingOpen: { type: Boolean, default: true },
    // Gamification
    points: { type: Number, default: 0 },
    // Organizer approval lifecycle
    organizerStatus: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
    organizerApplication: { organization: String, reason: String, appliedAt: Date },
    onboardingCompleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.index({ name: 'text', bio: 'text', title: 'text' });
userSchema.index({ role: 1, organizerStatus: 1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function matchPassword(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.signToken = function signToken() {
  return jwt.sign({ id: this._id.toString(), role: this.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
