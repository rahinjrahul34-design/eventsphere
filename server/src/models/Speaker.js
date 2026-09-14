const mongoose = require('mongoose');

const speakerSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }, // null = global speaker directory
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    title: { type: String, default: '' },
    company: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 900 },
    photo: {
      type: String,
      default: '/images/avatars/default.svg',
    },
    skills: { type: [String], default: [] },
    social: {
      linkedin: { type: String, default: '' },
      twitter: { type: String, default: '' },
      website: { type: String, default: '' },
    },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

speakerSchema.index({ event: 1 });
speakerSchema.index({ name: 'text' });

module.exports = mongoose.model('Speaker', speakerSchema);
