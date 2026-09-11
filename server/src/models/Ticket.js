const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ticketType: { type: String, default: 'General' },
    attendeeName: { type: String, required: true },
    status: { type: String, enum: ['valid', 'used', 'cancelled'], default: 'valid' },
    issuedAt: { type: Date, default: Date.now },
    checkedInAt: { type: Date },
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ticketSchema.index({ user: 1, event: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
