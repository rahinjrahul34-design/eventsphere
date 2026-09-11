const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['keynote', 'talk', 'workshop', 'panel', 'break', 'networking', 'activity', 'ceremony'],
      default: 'talk',
    },
    speaker: { type: mongoose.Schema.Types.ObjectId, ref: 'Speaker' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    room: { type: String, default: 'Main Hall' },
    day: { type: Number, default: 1 },
    order: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0 }, // analytics: poll/chat activity weight
  },
  { timestamps: true }
);

sessionSchema.index({ event: 1, startTime: 1 });

module.exports = mongoose.model('Session', sessionSchema);
