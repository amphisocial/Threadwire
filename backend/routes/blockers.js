const express = require('express');
const router = express.Router();
const blockerController = require('../controllers/blockerController');
const { authenticateToken } = require('../services/authToken')

// Define endpoints
router.post('/', authenticateToken, blockerController.createBlocker);
router.get('/', authenticateToken, blockerController.getBlockers);
router.get('/:id',authenticateToken, blockerController.getBlockerById);
router.put('/:id',authenticateToken, blockerController.updateBlocker);
router.delete('/:id',authenticateToken, blockerController.deleteBlocker);

module.exports = router;

