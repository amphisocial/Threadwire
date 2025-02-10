const express = require('express');
const router = express.Router();
const blockerController = require('../controllers/blockerController');

// Define endpoints
router.post('/', blockerController.createBlocker);
router.get('/', blockerController.getBlockers);
router.get('/:id', blockerController.getBlockerById);
router.put('/:id', blockerController.updateBlocker);
router.delete('/:id', blockerController.deleteBlocker);

module.exports = router;

