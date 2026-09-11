const router = require('express').Router();

router.get('/health', (req, res) =>
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } })
);

router.use('/auth', require('./auth.routes'));
router.use('/events', require('./events.routes'));
router.use('/registrations', require('./registrations.routes'));
router.use('/tickets', require('./tickets.routes'));
router.use('/payments', require('./payments.routes'));
router.use('/categories', require('./categories.routes'));
router.use('/notifications', require('./notifications.routes'));
router.use('/certificates', require('./certificates.routes'));
router.use('/', require('./feedback.routes'));
router.use('/analytics', require('./analytics.routes'));
router.use('/gamification', require('./gamification.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/ai', require('./ai.routes'));
router.use('/search', require('./search.routes'));
router.use('/', require('./engagement.routes'));
router.use('/', require('./live.routes'));
router.use('/', require('./networking.routes'));
router.use('/', require('./misc.routes'));

module.exports = router;
