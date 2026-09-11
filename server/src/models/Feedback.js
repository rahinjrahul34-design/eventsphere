const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    contentRating: { type: Number, min: 1, max: 5 },
    organizationRating: { type: Number, min: 1, max: 5 },
    venueRating: { type: Number, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 1200 },
    wouldRecommend: { type: Boolean, default: true },
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' },
  },
  { timestamps: true }
);

feedbackSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
