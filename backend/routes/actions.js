const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../services/authToken')
const trackApiUsage = require('../services/apiUsageTracker');
const actionItemController = require('../controllers/actionItemController');

router.post('/',authenticateToken, requireScope('write:actions'), trackApiUsage, actionItemController.createActionItem);
router.get('/',authenticateToken, requireScope('read:actions'), trackApiUsage, actionItemController.getActionItems);
router.get('/blocker/:blockerId',authenticateToken, requireScope('read:actions'), trackApiUsage, actionItemController.getActionItemsByBlockerId);
router.get('/:id',authenticateToken, requireScope('read:actions'), trackApiUsage, actionItemController.getActionItemById);
router.put('/:id',authenticateToken, requireScope('write:actions'), trackApiUsage, actionItemController.updateActionItem);
router.delete('/:id',authenticateToken, requireScope('delete:actions'), trackApiUsage, actionItemController.deleteActionItem);

module.exports = router;
