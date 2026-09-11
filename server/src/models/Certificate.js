const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    certificateId: { type: String, required: true, unique: true, trim: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration' },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recipientName: { type: String, required: true },
    eventTitle: { type: String, required: true },
    organizerName: { type: String, default: '' },
    type: { type: String, enum: ['participation', 'winner', 'volunteer', 'speaker', 'excellence'], default: 'participation' },
    issuedAt: { type: Date, default: Date.now },
    eventDate: { type: Date },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

certificateSchema.index({ user: 1 });
certificateSchema.index({ event: 1 });

module.exports = mongoose.model('Certificate', certificateSchema);
