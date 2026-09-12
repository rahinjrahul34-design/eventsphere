const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration' },
    position: { type: Number, required: true },
    status: {
      type: String,
      enum: ['waiting', 'eligible', 'hold_active', 'notified', 'promoted', 'expired', 'declined', 'skipped', 'ineligible'],
      default: 'waiting',
    },
    activeHold: { type: mongoose.Schema.Types.ObjectId, ref: 'SeatHold' },
    ticketType: {
      name: { type: String, default: 'General' },
      price: { type: Number, default: 0 },
    },
    skipReason: { type: String, default: '' },
    notifiedAt: { type: Date },
    promotedAt: { type: Date },
    declinedAt: { type: Date },
  },
  { timestamps: true }
);

waitlistSchema.index({ event: 1, status: 1, position: 1 });
waitlistSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Waitlist', waitlistSchema);
