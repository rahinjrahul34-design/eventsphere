const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    question: { type: String, required: true, maxlength: 240 },
    options: [
      {
        text: { type: String, required: true },
        voters: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
      },
    ],
    multiple: { type: Boolean, default: false },
    closed: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

pollSchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model('Poll', pollSchema);
