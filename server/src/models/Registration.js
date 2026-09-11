const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema(
  { field: String, label: String, value: mongoose.Schema.Types.Mixed },
  { _id: false }
);

const registrationSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ticketType: {
      name: { type: String, default: 'General' },
      price: { type: Number, default: 0 },
    },
    quantity: { type: Number, default: 1, min: 1 },
    responses: { type: [responseSchema], default: [] },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'waitlisted', 'checked_in'],
      default: 'pending',
    },
    amountPaid: { type: Number, default: 0 },
    source: { type: String, default: 'direct' },
    waitlistPosition: { type: Number, default: 0 },
    registeredAt: { type: Date, default: Date.now },
    checkedInAt: { type: Date },
    checkInMethod: { type: String, enum: ['qr', 'manual', ''], default: '' },
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pointsAwarded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

registrationSchema.index({ event: 1, user: 1 }, { unique: true });
registrationSchema.index({ status: 1, event: 1 });
registrationSchema.index({ user: 1 });

module.exports = mongoose.model('Registration', registrationSchema);
