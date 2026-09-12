/**
 * Feature Extractor for EventPulse AI
 * Extracts normalized, empirical signals from MongoDB records without fabricating any numbers.
 */

const Event = require('../../models/Event');
const Registration = require('../../models/Registration');
const Feedback = require('../../models/Feedback');
const Poll = require('../../models/Poll');
const Question = require('../../models/Question');
const Message = require('../../models/Message');
const Favorite = require('../../models/Favorite');
const Connection = require('../../models/Connection');

async function extractEventFeatures(eventId) {
  const event = await Event.findById(eventId).lean();
  if (!event) return null;

  const now = new Date();
  const eventStart = new Date(event.startDate);
  const eventEnd = new Date(event.endDate || event.startDate);
  const createdAt = new Date(event.createdAt || event._id.getTimestamp());

  const daysSincePublication = Math.max(0.1, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const durationHours = Math.max(1, (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60));

  const isLive = event.status === 'live' || (now >= eventStart && now <= eventEnd);
  const isCompleted = event.status === 'completed' || now > eventEnd;

  // 1. Registrations & Attendance Signals
  const allRegistrations = await Registration.find({ event: eventId }).lean();
  const confirmedRegs = allRegistrations.filter((r) => ['confirmed', 'checked_in'].includes(r.status));
  const cancelledRegs = allRegistrations.filter((r) => r.status === 'cancelled');
  const checkedInRegs = confirmedRegs.filter((r) => r.status === 'checked_in');

  const totalConfirmed = confirmedRegs.length;
  const currentCheckedIns = checkedInRegs.length;
  const currentCapacity = Math.max(1, event.capacity || 100);
  const capacityUtilization = Math.min(1.2, totalConfirmed / currentCapacity);

  // Time windows for velocity (24h, 48h, 7d)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const regsLast24h = confirmedRegs.filter((r) => new Date(r.createdAt || r.registeredAt) >= oneDayAgo).length;
  const regsPrev24h = confirmedRegs.filter((r) => {
    const d = new Date(r.createdAt || r.registeredAt);
    return d >= twoDaysAgo && d < oneDayAgo;
  }).length;
  const regsLast7d = confirmedRegs.filter((r) => new Date(r.createdAt || r.registeredAt) >= sevenDaysAgo).length;

  // Recommendation conversions
  const recommendationRegs = confirmedRegs.filter((r) => r.source === 'recommendation').length;

  // 2. Live Engagement & Interaction Signals
  const [polls, questions, messages, feedbacks, favoritesCount] = await Promise.all([
    Poll.find({ event: eventId }).lean(),
    Question.find({ event: eventId }).lean(),
    Message.countDocuments({ kind: 'event', event: eventId }),
    Feedback.find({ event: eventId }).lean(),
    Favorite.countDocuments({ event: eventId }),
  ]);

  const totalPollVotes = polls.reduce((sum, p) => {
    const votes = (p.options || []).reduce((acc, opt) => acc + (opt.voters ? opt.voters.length : 0), 0);
    return sum + votes;
  }, 0);

  const questionUpvotes = questions.reduce((acc, q) => acc + (q.upvotes ? q.upvotes.length : 0), 0);
  const answeredQuestions = questions.filter((q) => q.answered).length;

  const ratings = feedbacks.map((f) => f.rating).filter((r) => typeof r === 'number');
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const positiveFeedbacks = feedbacks.filter((f) => f.sentiment === 'positive').length;

  // 3. Organizer Historical Benchmarks
  const pastOrgEvents = await Event.find({
    organizer: event.organizer,
    _id: { $ne: event._id },
    status: 'completed',
  }).select('_id capacity registrationCount checkedInCount').lean();

  let historicalOrgAttendanceRate = null;
  let historicalOrgEventsCount = pastOrgEvents.length;

  if (pastOrgEvents.length > 0) {
    const totalPastRegs = pastOrgEvents.reduce((s, e) => s + (e.registrationCount || 0), 0);
    const totalPastCheckins = pastOrgEvents.reduce((s, e) => s + (e.checkedInCount || 0), 0);
    if (totalPastRegs > 0) {
      historicalOrgAttendanceRate = Math.min(1.0, totalPastCheckins / totalPastRegs);
    }
  }

  // 4. Ticket pricing profile
  const isPaid = (event.price && event.price > 0) ||
    (event.ticketTypes && event.ticketTypes.some((t) => t.price > 0));
  const basePrice = event.price || 0;

  // 5. Daily registration series for trend charting (last 14 days)
  const dailyHistory = [];
  for (let i = 13; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const count = confirmedRegs.filter((r) => {
      const d = new Date(r.createdAt || r.registeredAt);
      return d >= dayStart && d < dayEnd;
    }).length;

    dailyHistory.push({
      date: dayStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      registrations: count,
    });
  }

  return {
    event: {
      _id: event._id,
      title: event.title,
      slug: event.slug,
      categorySlug: event.categorySlug || 'technology',
      eventType: event.eventType || 'offline',
      capacity: currentCapacity,
      startDate: eventStart,
      endDate: eventEnd,
      status: event.status,
      isPaid,
      basePrice,
      isLive,
      isCompleted,
      ticketTypesCount: (event.ticketTypes || []).length,
      views: event.views || 0,
      popularityScore: event.popularityScore || 0,
      favoritesCount,
    },
    timing: {
      daysSincePublication: Number(daysSincePublication.toFixed(2)),
      daysRemaining: Number(daysRemaining.toFixed(2)),
      durationHours: Number(durationHours.toFixed(1)),
      dayOfWeek: eventStart.getDay(),
      isWeekend: eventStart.getDay() === 0 || eventStart.getDay() === 6,
    },
    registrations: {
      totalConfirmed,
      cancelledCount: cancelledRegs.length,
      currentCheckedIns,
      capacityUtilization: Number(capacityUtilization.toFixed(3)),
      recommendationRegs,
      dailyHistory,
      velocity: {
        last24h: regsLast24h,
        prev24h: regsPrev24h,
        last7d: regsLast7d,
        avgDailyLast7d: Number((regsLast7d / 7).toFixed(2)),
      },
    },
    engagement: {
      pollVotes: totalPollVotes,
      pollsCount: polls.length,
      questionsCount: questions.length,
      questionUpvotes,
      answeredQuestions,
      chatMessages: messages,
      feedbackCount: feedbacks.length,
      avgRating: Number(avgRating.toFixed(2)),
      positiveFeedbacks,
    },
    historical: {
      hasOrgHistory: historicalOrgAttendanceRate !== null,
      historicalOrgAttendanceRate,
      historicalEventsCount: historicalOrgEventsCount,
      isColdStart: historicalOrgEventsCount < 2 && totalConfirmed < 10,
    },
  };
}

module.exports = {
  extractEventFeatures,
};
