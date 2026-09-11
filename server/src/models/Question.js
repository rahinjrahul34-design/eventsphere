const mongoose = require('mongoose');

// Live Q&A questions (event live mode).
const questionSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, default: 'Anonymous' },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
    text: { type: String, required: true, maxlength: 600 },
    upvotes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    answered: { type: Boolean, default: false },
    answer: { type: String, default: '' },
    answeredByName: { type: String, default: '' },
  },
  { timestamps: true }
);

questionSchema.index({ event: 1, answered: 1, createdAt: -1 });

module.exports = mongoose.model('Question', questionSchema);
