const router = require('express').Router();
const { optionalAuth } = require('../middleware/auth');
const s = require('../controllers/searchController');

router.get('/', optionalAuth, s.globalSearch);

module.exports = router;
