const mongoose = require('mongoose');

// Event live chat + direct messages between attendees (networking).
const messageSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['event', 'dm'], required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, default: '' },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // dm only
    text: { type: String, required: true, maxlength: 1200, trim: true },
    system: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ event: 1, createdAt: -1 });
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
