const Connection = require('../models/Connection');
const Message = require('../models/Message');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created } = require('../utils/response');
const { getSuggestions, getConnections } = require('../services/networkingService');
const notificationService = require('../services/notificationService');
const gamification = require('../services/gamificationService');
const { POINTS } = require('../utils/badges');
const { emitToUser } = require('../sockets');

const suggestions = asyncHandler(async (req, res) => {
  const people = await getSuggestions(req.user, { limit: parseInt(req.query.limit || '12', 10) });
  ok(res, people);
});

const listConnections = asyncHandler(async (req, res) => {
  const connections = await getConnections(req.user._id);
  ok(res, connections);
});

const requestConnection = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) throw ApiError.notFound('User not found');
  if (target._id.toString() === req.userId.toString()) throw ApiError.badRequest('You cannot connect with yourself');

  const existing = await Connection.findOne({
    $or: [
      { requester: req.user._id, recipient: target._id },
      { requester: target._id, recipient: req.user._id },
    ],
  });
  if (existing) {
    if (existing.status === 'rejected') {
      existing.status = 'pending';
      existing.requester = req.user._id;
      existing.recipient = target._id;
      await existing.save();
    } else {
      throw ApiError.conflict('Connection already exists');
    }
  } else {
    await Connection.create({ requester: req.user._id, recipient: target._id, status: 'pending' });
  }

  await notificationService.notify({
    user: target._id,
    type: 'connection',
    title: `${req.user.name} wants to connect`,
    message: 'Accept to start networking and chat.',
    link: '/network',
  });
  created(res, { requested: true });
});

const respondConnection = asyncHandler(async (req, res) => {
  const { action } = req.body; // accept | reject
  const conn = await Connection.findById(req.params.id);
  if (!conn) throw ApiError.notFound('Connection not found');
  if (conn.recipient.toString() !== req.userId.toString()) throw ApiError.forbidden();

  if (action === 'accept') {
    conn.status = 'accepted';
    conn.respondedAt = new Date();
    await conn.save();
    await gamification.awardPoints({
      userId: conn.requester, points: POINTS.CONNECTION, reason: 'New networking connection',
    });
    await gamification.awardPoints({
      userId: conn.recipient, points: POINTS.CONNECTION, reason: 'New networking connection',
    });
    await notificationService.notify({
      user: conn.requester,
      type: 'connection',
      title: `${req.user.name} accepted your connection request`,
      message: 'You can now chat directly.',
      link: '/network',
    });
  } else {
    conn.status = 'rejected';
    conn.respondedAt = new Date();
    await conn.save();
  }
  ok(res, { status: conn.status });
});

// Public profile (limited)
const publicProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    'name avatar title company bio location interests skills networkingGoal website social role points'
  );
  if (!user) throw ApiError.notFound('User not found');
  const connection = await Connection.findOne({
    $or: [
      { requester: req.userId, recipient: user._id },
      { requester: user._id, recipient: req.userId },
    ],
  });
  ok(res, { ...user.toObject(), connectionStatus: connection?.status || null, connectionDirection:
    connection ? (connection.requester.toString() === req.userId.toString() ? 'outgoing' : 'incoming') : null });
});

// DM history + send
const dmHistory = asyncHandler(async (req, res) => {
  const otherId = req.params.userId;
  const messages = await Message.find({
    kind: 'dm',
    $or: [
      { sender: req.user._id, recipient: otherId },
      { sender: otherId, recipient: req.user._id },
    ],
  }).sort({ createdAt: 1 }).limit(200);
  ok(res, messages);
});

const sendDM = asyncHandler(async (req, res) => {
  const recipient = await User.findById(req.params.userId);
  if (!recipient) throw ApiError.notFound('User not found');
  const conn = await Connection.findOne({
    $or: [
      { requester: req.user._id, recipient: recipient._id },
      { requester: recipient._id, recipient: req.user._id },
    ],
    status: 'accepted',
  });
  if (!conn) throw ApiError.forbidden('You can only message accepted connections');

  const message = await Message.create({
    kind: 'dm',
    sender: req.user._id,
    senderName: req.user.name,
    recipient: recipient._id,
    text: String(req.body.text || '').slice(0, 1200),
  });
  emitToUser(recipient._id, 'dm:message', {
    _id: message._id, sender: req.user._id, senderName: req.user.name,
    text: message.text, createdAt: message.createdAt,
  });
  created(res, message);
});

const dmList = asyncHandler(async (req, res) => {
  const messages = await Message.find({
    kind: 'dm',
    $or: [{ sender: req.user._id }, { recipient: req.user._id }],
  }).sort({ createdAt: -1 });
  const threads = new Map();
  messages.forEach((m) => {
    const other = m.sender.toString() === req.userId.toString() ? m.recipient.toString() : m.sender.toString();
    if (!threads.has(other)) threads.set(other, { userId: other, lastMessage: m });
  });
  const users = await User.find({ _id: { $in: [...threads.keys()] } }).select('name avatar title company');
  ok(res, [...threads.values()].map((t) => ({
    user: users.find((u) => u._id.toString() === t.userId.toString()),
    lastMessage: t.lastMessage,
  })).filter((t) => t.user));
});

module.exports = {
  suggestions, listConnections, requestConnection, respondConnection,
  publicProfile, dmHistory, sendDM, dmList,
};
