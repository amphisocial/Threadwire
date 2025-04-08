const express = require('express');
const router = express.Router();
const controllers = require('../controllers/workorderController');
const { authenticateToken } = require('../services/authToken')
const trackApiUsage = require('../services/apiUsageTracker');


// WorkOrder Routes
router.post('/', authenticateToken, requireScope('write:workorders'), trackApiUsage, controllers.createWorkOrder);
router.post('/import', authenticateToken, requireScope('write:workorders'), trackApiUsage, controllers.importWorkorders);
router.put('/:id', authenticateToken, requireScope('write:workorders'), trackApiUsage,  controllers.updateWorkOrder);
router.delete('/:id', authenticateToken, requireScope('delete:workorders'), trackApiUsage, controllers.deleteWorkOrder);
router.get('/', authenticateToken, requireScope('read:workorders'), trackApiUsage, controllers.getWorkOrders);

module.exports = router;

