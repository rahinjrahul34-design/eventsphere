const Event = require('../../models/Event');

/**
 * Retrieves candidate events for recommendation ranking.
 * Avoids N+1 queries and leverages database indexes.
 */
async function getCandidateEvents({ userProfile, filterOptions = {} }) {
  const now = new Date();

  const query = {
    status: { $in: ['published', 'live'] },
    approvalStatus: 'approved',
    endDate: { $gte: now },
  };

  if (filterOptions.category) {
    query.categorySlug = filterOptions.category;
  }
  if (filterOptions.eventType) {
    query.eventType = filterOptions.eventType;
  }

  // Retrieve candidate events with essential projection
  const events = await Event.find(query)
    .populate('organizer', 'name company avatar title')
    .populate('category', 'name slug color icon')
    .lean();

  return events;
}

module.exports = {
  getCandidateEvents,
};
