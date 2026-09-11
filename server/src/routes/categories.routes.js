const router = require('express').Router();
const list = require('../controllers/categoryController').list;

router.get('/', list);

module.exports = router;
