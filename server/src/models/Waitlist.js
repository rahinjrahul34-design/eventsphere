const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration' },
    position: { type: Number, required: true },
    status: { type: String, enum: ['waiting', 'notified', 'promoted', 'expired'], default: 'waiting' },
    notifiedAt: { type: Date },
    promotedAt: { type: Date },
  },
  { timestamps: true }
);

waitlistSchema.index({ event: 1, status: 1, position: 1 });
waitlistSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Waitlist', waitlistSchema);
