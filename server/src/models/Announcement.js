const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, default: 'Organizer' },
    title: { type: String, required: true, maxlength: 160 },
    body: { type: String, default: '', maxlength: 1200 },
    severity: { type: String, enum: ['info', 'success', 'warning', 'emergency'], default: 'info' },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

announcementSchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
