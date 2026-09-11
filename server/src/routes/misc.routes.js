const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const reg = require('../controllers/registrationController');
const cert = require('../controllers/certificateController');

// Registration + waitlist + certificate issue nested on events
router.post('/events/:id/register', requireAuth, reg.registerForEvent);
router.get('/events/:id/registrations', requireAuth, reg.eventRegistrations);
router.post('/waitlist/:id/promote', requireAuth, reg.promoteWaitlist);

router.post('/events/:id/certificates/issue', requireAuth, cert.issueCertificates);
router.get('/events/:id/certificates', requireAuth, cert.eventCertificates);

module.exports = router;
