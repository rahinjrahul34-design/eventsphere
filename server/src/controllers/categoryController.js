const Category = require('../models/Category');
const Event = require('../models/Event');
const { asyncHandler, ok } = require('../utils/response');

const list = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  const counts = await Event.aggregate([
    { $match: { approvalStatus: 'approved', status: { $in: ['published', 'live'] } } },
    { $group: { _id: '$categorySlug', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  ok(res, categories.map((c) => ({ ...c.toObject(), eventCount: countMap[c.slug] || 0 })));
});

module.exports = { list };
