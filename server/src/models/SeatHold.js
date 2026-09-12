const mongoose = require('mongoose');

const seatHoldSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    waitlistEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Waitlist',
      required: true,
      index: true,
    },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
    },
    ticketType: {
      name: { type: String, default: 'General' },
      price: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['active', 'accepted', 'expired', 'declined', 'cancelled'],
      default: 'active',
      index: true,
    },
    holdExpiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    holdDurationMinutes: {
      type: Number,
      default: 15,
      min: 5,
      max: 60,
    },
    notifiedAt: {
      type: Date,
      default: Date.now,
    },
    reminderSentAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    declinedAt: {
      type: Date,
      default: null,
    },
    expiredAt: {
      type: Date,
      default: null,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

seatHoldSchema.index({ eventId: 1, status: 1, holdExpiresAt: 1 });
seatHoldSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('SeatHold', seatHoldSchema);
