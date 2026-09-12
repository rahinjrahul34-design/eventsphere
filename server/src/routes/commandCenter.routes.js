/**
 * Command Center Routes
 *
 * Exposes API endpoints for event command center intelligence.
 * All routes require authentication and are protected by RBAC in the controller.
 */

const router = require('express').Router({ mergeParams: true });
const { requireAuth } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');
const ctrl = require('../controllers/commandCenterController');

router.use(requireAuth);

// Primary Aggregation
router.get('/:eventId', ctrl.getCommandCenter);
router.get('/', ctrl.getCommandCenter);

// What-If Scenario Simulator
router.post('/:eventId/simulate', ctrl.simulate);
router.post('/simulate', ctrl.simulate);

// AI Executive Brief
router.post('/:eventId/brief', aiLimiter, ctrl.getAiBrief);
router.post('/brief', aiLimiter, ctrl.getAiBrief);

// Action Resolution
router.patch('/:eventId/actions/:actionId', ctrl.updateActionStatus);
router.patch('/actions/:actionId', ctrl.updateActionStatus);

module.exports = router;
