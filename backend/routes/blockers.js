const express = require('express');
const router = express.Router();
const blockerController = require('../controllers/blockerController');
const { authenticateToken } = require('../services/authToken');
const trackApiUsage = require('../services/apiUsageTracker');


// Define endpoints
router.post('/', authenticateToken, requireScope('write:blockers'), trackApiUsage, blockerController.createBlocker);
router.get('/', authenticateToken, requireScope('read:blockers'), trackApiUsage, blockerController.getBlockers);
router.get('/:id',authenticateToken, requireScope('read:blockers'), trackApiUsage, blockerController.getBlockerById);
router.put('/:id',authenticateToken, requireScope('write:blockers'), trackApiUsage, blockerController.updateBlocker);
router.delete('/:id',authenticateToken, requireScope('delete:blockers'), trackApiUsage, blockerController.deleteBlocker);

module.exports = router;

