const User = require('../models/User');
const Event = require('../models/Event');
const Report = require('../models/Report');
const Category = require('../models/Category');
const AuditLog = require('../models/AuditLog');
const Sponsor = require('../models/Sponsor');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created } = require('../utils/response');
const { platformAnalytics } = require('../services/analyticsService');
const audit = require('../services/auditService').log;
const notificationService = require('../services/notificationService');
const { slugify } = require('../utils/codes');

/**
 * TrustSphere async recalculation helper (CORE FEATURE 35): fires after
 * meaningful verification/moderation events. Never blocks the admin response
 * and never breaks the calling flow if the trust engine fails.
 */
function recalcTrustAsync(organizerId, trigger, reason) {
  if (!organizerId) return;
  try {
    const trustProfileService = require('../services/trustsphere/trustProfileService');
    trustProfileService
      .calculateAndSaveTrustProfile(organizerId, trigger, reason)
      .catch((err) => console.error(`[TrustSphere] async recalc (${trigger}) error:`, err.message));
  } catch (err) {
    // Non-blocking
  }
}

// GET /api/admin/stats
const dashboard = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days || '30', 10);
  const analytics = await platformAnalytics(days);
  const [recentUsers, pendingEvents, pendingOrgs] = await Promise.all([
    User.find().sort({ createdAt: -1 }).limit(6).select('name email role avatar organizerStatus createdAt isActive'),
    Event.find({ approvalStatus: 'pending' }).sort({ createdAt: -1 }).limit(6).populate('organizer', 'name email company').populate('category', 'name'),
    User.find({ role: 'organizer', organizerStatus: 'pending' }).sort({ createdAt: -1 }),
  ]);
  ok(res, { ...analytics, recentUsers, pendingEvents, pendingOrgs });
});

// GET /api/admin/users
const listUsers = asyncHandler(async (req, res) => {
  const { role, q, status, organizerStatus } = req.query;
  const query = {};
  if (role && role !== 'all') query.role = role;
  if (organizerStatus) query.organizerStatus = organizerStatus;
  if (status === 'active') query.isActive = true;
  if (status === 'suspended') query.isActive = false;
  if (q) query.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }, { company: new RegExp(q, 'i') }];
  const users = await User.find(query).sort({ createdAt: -1 }).limit(200);
  ok(res, users);
});

// PATCH /api/admin/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  const { role, isActive, organizerStatus } = req.body;
  if (role && ['attendee', 'organizer', 'volunteer', 'speaker', 'admin'].includes(role)) {
    user.role = role;
    await audit({ actor: req.user, action: 'user.role_changed', targetType: 'user', targetId: user._id, meta: { role }, ip: req.ip });
  }
  if (typeof isActive === 'boolean') {
    user.isActive = isActive;
    await audit({ actor: req.user, action: isActive ? 'user.activated' : 'user.suspended', targetType: 'user', targetId: user._id, ip: req.ip });
    await notificationService.notify({
      user: user._id, type: 'system',
      title: isActive ? 'Your account was reactivated' : 'Your account was suspended',
      message: isActive ? 'Welcome back!' : 'Contact support if you believe this is a mistake.',
    });
  }
  if (organizerStatus && ['pending', 'approved', 'rejected'].includes(organizerStatus)) {
    const verificationChanged = user.organizerStatus !== organizerStatus;
    user.organizerStatus = organizerStatus;
    if (organizerStatus === 'approved') user.role = 'organizer';
    await audit({ actor: req.user, action: `organizer.${organizerStatus}`, targetType: 'user', targetId: user._id, ip: req.ip });
    await notificationService.notify({
      user: user._id, type: 'system',
      title: organizerStatus === 'approved' ? 'You are now an approved organizer!' : `Organizer application ${organizerStatus}`,
      message: organizerStatus === 'approved' ? 'You can publish events immediately.' : 'Contact the admin team for details.',
      link: organizerStatus === 'approved' ? '/dashboard/events' : '',
    });

    // TrustSphere: verification status feeds the verification component (CORE FEATURE 10/35)
    if (verificationChanged) {
      recalcTrustAsync(user._id, 'VERIFICATION_CHANGED', `Organizer verification status changed to ${organizerStatus}`);
    }
  }
  await user.save();
  ok(res, user);
});

// GET /api/admin/events
const listAllEvents = asyncHandler(async (req, res) => {
  const { approvalStatus, status, q } = req.query;
  const query = {};
  if (approvalStatus && approvalStatus !== 'all') query.approvalStatus = approvalStatus;
  if (status && status !== 'all') query.status = status;
  if (q) query.title = new RegExp(q, 'i');
  const events = await Event.find(query).sort({ createdAt: -1 }).populate('organizer', 'name email company').populate('category', 'name slug').limit(200);
  ok(res, events);
});

// POST /api/admin/events/:id/approve
const approveEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizer', 'name');
  if (!event) throw ApiError.notFound('Event not found');
  event.approvalStatus = 'approved';
  event.approvalNote = req.body.note || '';
  if (event.status === 'published') {
    /* already public-ready */
  } else if (req.body.publish) {
    event.status = 'published';
  }
  await event.save();
  await audit({ actor: req.user, action: 'event.approved', targetType: 'event', targetId: event._id, meta: { title: event.title }, ip: req.ip });
  await notificationService.notify({
    user: event.organizer._id, type: 'system',
    title: `Event approved: ${event.title}`,
    message: 'Your event is now visible in discovery.',
    link: `/events/${event.slug}`,
  });
  ok(res, event);
});

// POST /api/admin/events/:id/reject
const rejectEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizer', 'name');
  if (!event) throw ApiError.notFound('Event not found');
  event.approvalStatus = 'rejected';
  event.approvalNote = req.body.note || '';
  if (event.status === 'published') event.status = 'draft';
  await event.save();
  await audit({ actor: req.user, action: 'event.rejected', targetType: 'event', targetId: event._id, meta: { note: req.body.note }, ip: req.ip });
  await notificationService.notify({
    user: event.organizer._id, type: 'system',
    title: `Event needs changes: ${event.title}`,
    message: req.body.note || 'An admin requested changes before approval.',
    link: `/dashboard/events`,
  });
  ok(res, event);
});

// GET /api/admin/reports
const listReports = asyncHandler(async (req, res) => {
  const reports = await Report.find(req.query.status ? { status: req.query.status } : {})
    .sort({ createdAt: -1 })
    .populate('reporter', 'name email')
    .limit(100);
  // Enrich targets
  const eventIds = reports.filter((r) => r.targetType === 'event').map((r) => r.target);
  const userIds = reports.filter((r) => r.targetType === 'user').map((r) => r.target);
  const [events, users] = await Promise.all([
    Event.find({ _id: { $in: eventIds } }).select('title slug'),
    User.find({ _id: { $in: userIds } }).select('name email'),
  ]);
  const byId = {};
  events.forEach((e) => { byId[e._id.toString()] = { label: e.title, link: `/events/${e.slug}` }; });
  users.forEach((u) => { byId[u._id.toString()] = { label: u.name, link: `/network` }; });
  ok(res, reports.map((r) => ({ ...r.toObject(), targetInfo: byId[r.target.toString()] || null })));
});

// PATCH /api/admin/reports/:id
const resolveReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw ApiError.notFound();
  const previousStatus = report.status;
  report.status = req.body.status || 'resolved';
  report.moderatorNote = req.body.note || '';
  report.resolvedBy = req.user._id;
  report.resolvedAt = new Date();
  await report.save();
  await audit({ actor: req.user, action: 'report.resolved', targetType: report.targetType, targetId: report.target, ip: req.ip });

  // TrustSphere: a moderation decision changes the organizer's verified
  // compliance record — recalculate their trust profile asynchronously
  // (CORE FEATURES 9/35). Event reports map to the event's organizer;
  // user reports target the organizer directly.
  if (['resolved', 'dismissed'].includes(report.status) && previousStatus !== report.status) {
    try {
      let organizerId = null;
      if (report.targetType === 'user') {
        organizerId = report.target;
      } else if (report.targetType === 'event') {
        const ev = await Event.findById(report.target).select('organizer');
        organizerId = ev?.organizer || null;
      }
      if (organizerId) {
        recalcTrustAsync(
          organizerId,
          'REPORT_RESOLVED',
          `Report ${report.status} (${report.reason}) by platform moderation`
        );
      }
    } catch (trustErr) {
      // Non-blocking
    }
  }

  ok(res, report);
});

// Categories (admin CRUD; public list lives in categoryController)
const createCategory = asyncHandler(async (req, res) => {
  const { name, icon, color, description } = req.body;
  if (!name) throw ApiError.badRequest('Category name required');
  const category = await Category.create({ name, slug: slugify(name), icon: icon || 'Sparkles', color: color || '#6366f1', description });
  created(res, category);
});
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound();
  Object.assign(category, req.body);
  if (req.body.name) category.slug = slugify(req.body.name);
  await category.save();
  ok(res, category);
});
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound();
  const eventCount = await Event.countDocuments({ category: category._id });
  if (eventCount) throw ApiError.conflict(`${eventCount} events use this category`);
  await category.deleteOne();
  ok(res, { deleted: true });
});

// Audit logs
const auditLogs = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200).populate('actor', 'name email role');
  ok(res, logs);
});

module.exports = {
  dashboard, listUsers, updateUser, listAllEvents, approveEvent, rejectEvent,
  listReports, resolveReport, createCategory, updateCategory, deleteCategory, auditLogs,
};
