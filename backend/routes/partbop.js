
const express = require('express');
const router = express.Router();
const controllers = require('../controllers/partbopController');
const { authenticateToken } = require('../services/authToken');
const trackApiUsage = require('../services/apiUsageTracker');



// PartBoP Routes
router.post('/', authenticateToken, requireScope('write:bops'), trackApiUsage, controllers.createPartBoP);
router.post('/import', authenticateToken, requireScope('write:bops'), trackApiUsage, controllers.importPartBoPs);
router.put('/:id', authenticateToken, requireScope('write:bops'), trackApiUsage, controllers.updatePartBoP);
router.delete('/:id', authenticateToken, requireScope('delete:bops'), trackApiUsage, controllers.deletePartBoP);
router.get('/', authenticateToken, requireScope('read:bops'), trackApiUsage, controllers.getPartBoPs);

module.exports = router;

