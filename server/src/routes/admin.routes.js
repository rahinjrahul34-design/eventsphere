const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const a = require('../controllers/adminController');

router.use(requireAuth, requireRole('admin'));

router.get('/stats', a.dashboard);
router.get('/audit', a.auditLogs);

router.get('/users', a.listUsers);
router.patch('/users/:id', a.updateUser);

router.get('/events', a.listAllEvents);
router.post('/events/:id/approve', a.approveEvent);
router.post('/events/:id/reject', a.rejectEvent);

router.get('/reports', a.listReports);
router.patch('/reports/:id', a.resolveReport);

router.post('/categories', a.createCategory);
router.put('/categories/:id', a.updateCategory);
router.delete('/categories/:id', a.deleteCategory);

module.exports = router;
