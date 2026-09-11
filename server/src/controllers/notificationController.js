const Notification = require('../models/Notification');
const { asyncHandler, ok } = require('../utils/response');

const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = 20;
  const [notifications, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  ok(res, { notifications, unread, page });
});

const markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  ok(res, { updated: true });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  ok(res, { updated: true });
});

module.exports = { list, markRead, markAllRead };
