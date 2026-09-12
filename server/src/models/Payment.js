const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    provider: { type: String, enum: ['razorpay', 'demo'], default: 'demo' },
    orderId: { type: String, default: '' },
    paymentId: { type: String, default: '' },
    status: {
      type: String,
      enum: ['created', 'captured', 'failed', 'refunded'],
      default: 'created',
    },
    ticketType: { type: String, default: 'General' },
    quantity: { type: Number, default: 1 },
    holdId: { type: mongoose.Schema.Types.ObjectId, ref: 'SeatHold' },
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1 });
paymentSchema.index({ event: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
