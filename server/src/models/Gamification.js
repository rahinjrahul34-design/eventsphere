const mongoose = require('mongoose');

// Immutable ledger of every point transaction.
const pointActivitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    points: { type: Number, required: true },
    reason: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
pointActivitySchema.index({ user: 1, createdAt: -1 });
pointActivitySchema.index({ event: 1, points: -1 });

// Badges awarded to a user (badge code from utils/badges catalogue).
const userBadgeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    icon: { type: String, default: 'Award' },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);
userBadgeSchema.index({ user: 1, code: 1 }, { unique: true });

module.exports = {
  PointActivity: mongoose.model('PointActivity', pointActivitySchema),
  UserBadge: mongoose.model('UserBadge', userBadgeSchema),
};
