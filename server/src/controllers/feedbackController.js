const Feedback = require('../models/Feedback');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created } = require('../utils/response');

const POSITIVE_WORDS = ['great', 'amazing', 'excellent', 'loved', 'awesome', 'fantastic', 'good', 'wonderful', 'inspiring', 'best', 'helpful'];
const NEGATIVE_WORDS = ['bad', 'poor', 'terrible', 'worst', 'disappointed', 'late', 'broken', 'rude', 'chaos', 'awful'];

function sentimentFor(rating, comment = '') {
  const c = comment.toLowerCase();
  const score = POSITIVE_WORDS.reduce((a, w) => a + (c.includes(w) ? 1 : 0), 0) -
    NEGATIVE_WORDS.reduce((a, w) => a + (c.includes(w) ? 1 : 0), 0);
  if (rating >= 4 && score >= 0) return 'positive';
  if (rating <= 2 || score < 0) return 'negative';
  return 'neutral';
}

const submitFeedback = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');
  const registration = await Registration.findOne({ event: event._id, user: req.user._id });
  if (!registration) throw ApiError.forbidden('Only registered attendees can leave feedback');
  const { rating, comment = '', contentRating, organizationRating, venueRating, wouldRecommend = true } = req.body;
  if (!rating || rating < 1 || rating > 5) throw ApiError.badRequest('Rating between 1 and 5 is required');

  const feedback = await Feedback.findOneAndUpdate(
    { event: event._id, user: req.user._id },
    {
      rating, comment, contentRating, organizationRating, venueRating, wouldRecommend,
      registration: registration._id, sentiment: sentimentFor(rating, comment),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  created(res, feedback);

  // Asynchronously update organizer's TrustSphere profile when new feedback is received
  if (event.organizer) {
    try {
      const { calculateAndSaveTrustProfile } = require('../services/trustsphere/trustProfileService');
      calculateAndSaveTrustProfile(
        event.organizer,
        'FEEDBACK_RECEIVED',
        `New verified attendee feedback: ${rating} stars`
      ).catch((err) => console.error('[TrustSphere] Async recalculation error:', err.message));
    } catch (err) {
      // Non-blocking
    }
  }
});

const eventFeedback = asyncHandler(async (req, res) => {
  const [feedback, agg] = await Promise.all([
    Feedback.find({ event: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('user', 'name avatar title'),
    Feedback.aggregate([
      { $match: { event: new (require('mongoose').Types.ObjectId)(req.params.id) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
  ]);
  ok(res, { feedback, averageRating: agg[0]?.avg || 0, count: agg[0]?.count || 0 });
});

module.exports = { submitFeedback, eventFeedback };
