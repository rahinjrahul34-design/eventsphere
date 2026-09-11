const router = require('express').Router();
const { requireAuth, optionalAuth, requireApprovedOrganizer } = require('../middleware/auth');
const ctrl = require('../controllers/eventController');

router.get('/', optionalAuth, ctrl.listEvents);
router.get('/mine', requireAuth, ctrl.myEvents);
router.get('/recommended', optionalAuth, ctrl.recommended);
router.get('/favorites', requireAuth, ctrl.listFavorites);
router.get('/calendar', requireAuth, ctrl.calendarEvents);
router.post('/', requireAuth, requireApprovedOrganizer, ctrl.createEvent);

router.get('/slug/:slug', optionalAuth, ctrl.getEventBySlug);
router.put('/:id', requireAuth, ctrl.updateEvent);
router.delete('/:id', requireAuth, ctrl.deleteEvent);
router.patch('/:id/status', requireAuth, ctrl.setStatus);
router.get('/:id/similar', ctrl.similarEvents);
router.post('/:id/favorite', requireAuth, ctrl.toggleFavorite);
router.post('/:id/report', requireAuth, ctrl.reportEvent);
router.get('/:id/ical', requireAuth, ctrl.ical);
router.get('/:id/registrations/export', requireAuth, ctrl.exportRegistrations);

module.exports = router;
