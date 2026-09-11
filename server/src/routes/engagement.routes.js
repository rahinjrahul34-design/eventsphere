const router = require('express').Router();
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const e = require('../controllers/engagementController');

// ── Speakers ──
router.get('/events/:eventId/speakers', optionalAuth, e.listSpeakers);
router.post('/events/:eventId/speakers', requireAuth, e.createSpeaker);
router.get('/speakers/me/sessions', requireAuth, requireRole('speaker', 'organizer', 'admin'), e.mySpeakingSessions);
router.put('/speakers/:id', requireAuth, e.updateSpeaker);
router.delete('/speakers/:id', requireAuth, e.deleteSpeaker);

// ── Sessions / schedule ──
router.get('/events/:eventId/sessions', optionalAuth, e.listSessions);
router.post('/events/:eventId/sessions', requireAuth, e.createSession);
router.put('/sessions/:id', requireAuth, e.updateSession);
router.delete('/sessions/:id', requireAuth, e.deleteSession);

// ── Volunteers ──
router.get('/events/:eventId/volunteers', requireAuth, e.listVolunteers);
router.post('/events/:eventId/volunteers', requireAuth, e.createVolunteer);
router.get('/volunteers/me', requireAuth, requireRole('volunteer', 'organizer', 'admin'), e.myAssignments);
router.put('/volunteers/:id', requireAuth, e.updateVolunteer);
router.delete('/volunteers/:id', requireAuth, e.deleteVolunteer);

// ── Sponsors ──
router.get('/events/:eventId/sponsors', optionalAuth, e.listSponsors);
router.post('/events/:eventId/sponsors', requireAuth, e.createSponsor);
router.get('/sponsors', optionalAuth, e.listSponsors);
router.post('/sponsors', requireAuth, requireRole('admin'), e.createSponsor);
router.put('/sponsors/:id', requireAuth, e.updateSponsor);
router.delete('/sponsors/:id', requireAuth, e.deleteSponsor);

module.exports = router;
