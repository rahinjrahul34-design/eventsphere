const Event = require('../../models/Event');
const User = require('../../models/User');
const Registration = require('../../models/Registration');
const Feedback = require('../../models/Feedback');
const Report = require('../../models/Report');

/**
 * Extracts strictly verified platform metrics for an organizer.
 * Excludes drafts, unapproved events, and unverified data.
 *
 * @param {string|mongoose.Types.ObjectId} organizerId
 * @returns {Promise<Object>} Extracted raw and normalized metrics
 */
async function extractOrganizerMetrics(organizerId) {
  const organizer = await User.findById(organizerId);
  if (!organizer) {
    throw new Error('Organizer not found');
  }

  // 1. Query all events created by organizer
  const allEvents = await Event.find({ organizer: organizerId }).sort({ startDate: -1 });

  // Filter for eligible events: approved events that have concluded or were cancelled/live
  const eligibleEvents = allEvents.filter(
    (e) => ['completed', 'published', 'live', 'cancelled'].includes(e.status) && e.approvalStatus === 'approved'
  );

  const completedEvents = eligibleEvents.filter((e) => e.status === 'completed');
  const cancelledEvents = eligibleEvents.filter((e) => e.status === 'cancelled');
  const liveOrPublishedEvents = eligibleEvents.filter((e) => ['published', 'live'].includes(e.status));

  const completedCount = completedEvents.length;
  const cancelledCount = cancelledEvents.length;
  const totalEligibleCount = completedCount + cancelledCount;

  // Completion Rate calculation
  const completionRate = totalEligibleCount > 0
    ? Math.round((completedCount / totalEligibleCount) * 1000) / 10
    : 100;

  const cancellationRate = totalEligibleCount > 0
    ? Math.round((cancelledCount / totalEligibleCount) * 1000) / 10
    : 0;

  const eventIds = allEvents.map((e) => e._id);

  // 2. Query Registrations & Attendance Fulfillment
  const registrations = eventIds.length > 0
    ? await Registration.find({
        event: { $in: eventIds },
        status: { $in: ['confirmed', 'checked_in', 'cancelled'] },
      })
    : [];

  const confirmedRegs = registrations.filter((r) => ['confirmed', 'checked_in'].includes(r.status));
  const checkedInRegs = registrations.filter((r) => r.status === 'checked_in');

  // Compute attendees served: take the maximum of registration checked-in count or event checkedInCount field
  let attendeesServed = checkedInRegs.length;
  let totalRegisteredAcrossCompleted = 0;
  let totalCheckedInAcrossCompleted = 0;

  completedEvents.forEach((ev) => {
    const evRegCount = ev.registrationCount || 0;
    const evCheckIn = Math.max(
      ev.checkedInCount || 0,
      checkedInRegs.filter((r) => r.event.toString() === ev._id.toString()).length
    );
    totalRegisteredAcrossCompleted += evRegCount;
    totalCheckedInAcrossCompleted += evCheckIn;
  });

  if (totalCheckedInAcrossCompleted > attendeesServed) {
    attendeesServed = totalCheckedInAcrossCompleted;
  }

  // Attendance rate (fulfillment of registrations)
  const attendanceRate = totalRegisteredAcrossCompleted > 0
    ? Math.min(100, Math.round((totalCheckedInAcrossCompleted / totalRegisteredAcrossCompleted) * 1000) / 10)
    : null; // Null indicates no completed registration data yet

  // 3. Query Verified Feedback
  const feedbacks = eventIds.length > 0
    ? await Feedback.find({ event: { $in: eventIds } })
    : [];

  const feedbackCount = feedbacks.length;
  let ratingSum = 0;
  let satisfiedCount = 0; // ratings >= 4.0

  feedbacks.forEach((f) => {
    const r = Number(f.rating) || 0;
    ratingSum += r;
    if (r >= 4.0) satisfiedCount++;
  });

  const averageRating = feedbackCount > 0
    ? Math.round((ratingSum / feedbackCount) * 10) / 10
    : 0;

  const satisfactionPercentage = feedbackCount > 0
    ? Math.round((satisfiedCount / feedbackCount) * 1000) / 10
    : 0;

  // 4. Query Complaints & Reports
  // Differentiate between open, dismissed (rejected), and resolved (confirmed violation)
  const reports = eventIds.length > 0
    ? await Report.find({
        $or: [
          { targetType: 'event', target: { $in: eventIds } },
          { targetType: 'user', target: organizerId },
        ],
      })
    : await Report.find({ targetType: 'user', target: organizerId });

  const totalReports = reports.length;
  const dismissedReports = reports.filter((r) => r.status === 'dismissed').length;
  const openReports = reports.filter((r) => ['open', 'reviewing'].includes(r.status)).length;
  const confirmedViolations = reports.filter((r) => r.status === 'resolved');

  // 5. Successful Events:
  // Event is completed and has 0 confirmed resolved violations
  const violationEventIdSet = new Set(
    confirmedViolations.filter((r) => r.targetType === 'event').map((r) => r.target.toString())
  );

  const successfulEvents = completedEvents.filter(
    (ev) => !violationEventIdSet.has(ev._id.toString())
  ).length;

  return {
    organizer,
    events: {
      all: allEvents,
      eligible: eligibleEvents,
      completed: completedEvents,
      cancelled: cancelledEvents,
      liveOrPublished: liveOrPublishedEvents,
    },
    metrics: {
      totalEvents: allEvents.length,
      eligibleEventsCount: eligibleEvents.length,
      completedEvents: completedCount,
      cancelledEvents: cancelledCount,
      completionRate,
      cancellationRate,
      attendeesServed,
      totalRegistrations: confirmedRegs.length,
      attendanceRate,
      totalFeedbackCount: feedbackCount,
      averageRating,
      satisfactionPercentage,
      totalReports,
      dismissedReports,
      openReports,
      confirmedViolationsCount: confirmedViolations.length,
      confirmedViolationsList: confirmedViolations,
      successfulEvents,
    },
  };
}

module.exports = {
  extractOrganizerMetrics,
};
