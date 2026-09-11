const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/certificateController');

router.get('/me', requireAuth, c.myCertificates);
router.get('/verify/:certificateId', c.verifyCertificate); // public
router.delete('/:id', requireAuth, c.revokeCertificate);

module.exports = router;
