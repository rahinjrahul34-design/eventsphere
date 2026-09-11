const Event = require('../models/Event');
const Announcement = require('../models/Announcement');
const Poll = require('../models/Poll');
const Question = require('../models/Question');
const Message = require('../models/Message');
const Registration = require('../models/Registration');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created } = require('../utils/response');
const { emitToEvent } = require('../sockets');
const notificationService = require('../services/notificationService');
const gamification = require('../services/gamificationService');
const { POINTS } = require('../utils/badges');

async function canManage(eventId, user) {
  const event = await Event.findById(eventId);
  if (!event) throw ApiError.notFound('Event not found');
  const isOwner = !!user && (
    event.organizer.toString() === user._id?.toString() || user.role === 'admin'
  );
  return { event, isOwner };
}

// GET /api/events/:id/live — full live-mode payload
const liveState = asyncHandler(async (req, res) => {
  const { event, isOwner } = await canManage(req.params.id, req.user);
  const [announcements, polls, questions, messages, sessions] = await Promise.all([
    Announcement.find({ event: event._id }).sort({ pinned: -1, createdAt: -1 }).limit(30),
    Poll.find({ event: event._id }).sort({ createdAt: -1 }).limit(10),
    Question.find({ event: event._id }).sort({ upvotes: -1, createdAt: -1 }).limit(50),
    Message.find({ kind: 'event', event: event._id }).sort({ createdAt: -1 }).limit(100),
    require('../models/Session').find({ event: event._id }).sort({ startTime: 1 }),
  ]);

  const now = new Date();
  const currentSession = sessions.find((s) => now >= s.startTime && now <= s.endTime) || null;
  const nextSession = sessions.find((s) => s.startTime > now) || null;
  const confirmedCount = await Registration.countDocuments({
    event: event._id, status: { $in: ['confirmed', 'checked_in'] },
  });

  ok(res, {
    event: {
      _id: event._id,
      title: event.title,
      slug: event.slug,
      status: event.status,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationCount: event.registrationCount,
      checkedInCount: event.checkedInCount,
      confirmedCount,
      isOwner: isOwner || undefined,
    },
    announcements,
    polls: polls.map((p) => pollView(p, req.user?._id)),
    questions,
    messages: messages.reverse(),
    currentSession,
    nextSession,
  });
});

/* ───────── Announcements ───────── */
const createAnnouncement = asyncHandler(async (req, res) => {
  const { event, isOwner } = await canManage(req.params.id, req.user);
  if (!isOwner) throw ApiError.forbidden();
  const { title, body = '', severity = 'info', pinned = false } = req.body;
  if (!title) throw ApiError.badRequest('Title is required');
  const announcement = await Announcement.create({
    event: event._id, title, body, severity, pinned,
    author: req.user._id, authorName: req.user.name,
  });
  emitToEvent(event._id.toString(), 'event:announcement', announcement);

  // Notify every confirmed attendee (in-app; email only for emergency/pinned).
  const regs = await Registration.find({
    event: event._id, status: { $in: ['confirmed', 'checked_in'] },
  }).select('user');
  await notificationService.notifyMany(
    regs.map((r) => ({
      user: r.user,
      type: 'announcement',
      title: `${event.title}: ${title}`,
      message: body,
      link: `/events/${event.slug}/live`,
      emailed: severity === 'emergency',
    }))
  );
  created(res, announcement);
});

const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.announcementId);
  if (!announcement) throw ApiError.notFound();
  const { isOwner } = await canManage(announcement.event, req.user);
  if (!isOwner) throw ApiError.forbidden();
  await announcement.deleteOne();
  emitToEvent(announcement.event.toString(), 'event:announcement-removed', { id: req.params.announcementId });
  ok(res, { deleted: true });
});

/* ───────── Polls ───────── */
function pollView(poll, userId) {
  const total = poll.options.reduce((a, o) => a + o.voters.length, 0);
  return {
    _id: poll._id,
    question: poll.question,
    multiple: poll.multiple,
    closed: poll.closed,
    createdAt: poll.createdAt,
    totalVotes: total,
    myVote: poll.options.findIndex((o) => userId && o.voters.some((v) => v.toString() === userId.toString())),
    options: poll.options.map((o) => ({
      _id: o._id,
      text: o.text,
      votes: o.voters.length,
      percent: total ? Math.round((o.voters.length / total) * 100) : 0,
    })),
  };
}

const createPoll = asyncHandler(async (req, res) => {
  const { event, isOwner } = await canManage(req.params.id, req.user);
  if (!isOwner) throw ApiError.forbidden();
  const { question, options, multiple = false } = req.body;
  if (!question || !Array.isArray(options) || options.length < 2) {
    throw ApiError.badRequest('Question and at least 2 options are required');
  }
  const poll = await Poll.create({
    event: event._id, question, multiple,
    options: options.map((text) => ({ text: String(text).slice(0, 120) })),
    createdBy: req.user._id,
  });
  emitToEvent(event._id.toString(), 'poll:new', pollView(poll, null));
  emitToEvent(event._id.toString(), 'notification:live', { kind: 'poll', title: 'New poll', question });
  created(res, pollView(poll, req.user._id));
});

const votePoll = asyncHandler(async (req, res) => {
  const poll = await Poll.findById(req.params.pollId);
  if (!poll) throw ApiError.notFound('Poll not found');
  if (poll.closed) throw ApiError.badRequest('This poll is closed');
  const idx = parseInt(req.body.optionIndex, 10);
  if (Number.isNaN(idx) || !poll.options[idx]) throw ApiError.badRequest('Invalid option');

  const already = poll.options.some((o) => o.voters.some((v) => v.toString() === req.userId.toString()));
  if (already && !poll.multiple) throw ApiError.conflict('You have already voted');
  if (!poll.options[idx].voters.some((v) => v.toString() === req.userId.toString())) {
    poll.options[idx].voters.push(req.user._id);
    await poll.save();
    await gamification.awardPoints({
      userId: req.user._id, eventId: poll.event,
      points: POINTS.POLL_ANSWER, reason: 'Answered a live poll',
    });
  }
  const view = pollView(poll, req.user._id);
  emitToEvent(poll.event.toString(), 'poll:update', view);
  ok(res, view);
});

const closePoll = asyncHandler(async (req, res) => {
  const poll = await Poll.findById(req.params.pollId);
  if (!poll) throw ApiError.notFound();
  const { isOwner } = await canManage(poll.event, req.user);
  if (!isOwner) throw ApiError.forbidden();
  poll.closed = true;
  await poll.save();
  emitToEvent(poll.event.toString(), 'poll:update', pollView(poll, null));
  ok(res, pollView(poll, req.user._id));
});

/* ───────── Q&A ───────── */
const askQuestion = asyncHandler(async (req, res) => {
  const { event } = await canManage(req.params.id, req.user);
  const question = await Question.create({
    event: event._id, user: req.user._id,
    userName: req.body.anonymous ? 'Anonymous' : req.user.name,
    session: req.body.session || null,
    text: String(req.body.text || '').slice(0, 600),
  });
  emitToEvent(event._id.toString(), 'qna:new', question);
  created(res, question);
});

const upvoteQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.questionId);
  if (!question) throw ApiError.notFound();
  const has = question.upvotes.some((u) => u.toString() === req.userId.toString());
  if (has) question.upvotes.pull(req.user._id);
  else question.upvotes.push(req.user._id);
  await question.save();
  emitToEvent(question.event.toString(), 'qna:update', question);
  ok(res, question);
});

const answerQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.questionId);
  if (!question) throw ApiError.notFound();
  const { isOwner } = await canManage(question.event, req.user);
  if (!isOwner) throw ApiError.forbidden();
  question.answered = true;
  question.answer = req.body.answer;
  question.answeredByName = req.user.name;
  await question.save();
  emitToEvent(question.event.toString(), 'qna:update', question);
  ok(res, question);
});

/* ───────── Chat (REST fallback; primary path is sockets) ───────── */
const chatHistory = asyncHandler(async (req, res) => {
  const messages = await Message.find({ kind: 'event', event: req.params.id }).sort({ createdAt: -1 }).limit(100);
  ok(res, messages.reverse());
});

const postChat = asyncHandler(async (req, res) => {
  const { event } = await canManage(req.params.id, req.user);
  const message = await Message.create({
    kind: 'event', event: event._id, sender: req.user._id,
    senderName: req.user.name, text: String(req.body.text || '').slice(0, 1200),
  });
  emitToEvent(event._id.toString(), 'chat:message', {
    _id: message._id, event: event._id, sender: req.user._id,
    senderName: req.user.name, text: message.text, createdAt: message.createdAt,
  });
  await gamification.awardPoints({
    userId: req.user._id, eventId: event._id,
    points: POINTS.CHAT, reason: 'live chat message',
  });
  created(res, message);
});

module.exports = {
  liveState,
  createAnnouncement, deleteAnnouncement,
  createPoll, votePoll, closePoll,
  askQuestion, upvoteQuestion, answerQuestion,
  chatHistory, postChat,
};
