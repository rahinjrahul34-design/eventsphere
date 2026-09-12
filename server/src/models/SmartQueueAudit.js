const mongoose = require('mongoose');

const smartQueueAuditSchema = new mongoose.Schema(
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
      index: true,
    },
    holdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SeatHold',
    },
    waitlistEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Waitlist',
    },
    action: {
      type: String,
      enum: [
        'WAITLIST_JOINED',
        'ELIGIBILITY_CHECKED',
        'SEAT_HELD',
        'NOTIFICATION_SENT',
        'REMINDER_SENT',
        'HOLD_ACCEPTED',
        'PAYMENT_STARTED',
        'PAYMENT_VERIFIED',
        'REGISTRATION_CONFIRMED',
        'HOLD_EXPIRED',
        'HOLD_DECLINED',
        'SEAT_RELEASED',
        'NEXT_PROMOTED',
        'PROMOTION_SKIPPED',
        'MANUAL_PROMOTION',
      ],
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    actor: {
      type: String,
      default: 'system',
    },
  },
  {
    timestamps: true,
  }
);

smartQueueAuditSchema.index({ eventId: 1, createdAt: -1 });

module.exports = mongoose.model('SmartQueueAudit', smartQueueAuditSchema);
