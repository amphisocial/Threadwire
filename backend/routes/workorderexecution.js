
const express = require('express');
const router = express.Router();
const controllers = require('../controllers/workorderexecutionController');
const { authenticateToken } = require('../services/authToken')
const trackApiUsage = require('../services/apiUsageTracker');



// WorkOrderExecution Routes
router.post('/', authenticateToken, requireScope('write:executions'), trackApiUsage, controllers.createWorkOrderExecution);
router.post('/import', authenticateToken, requireScope('write:executions'), trackApiUsage, controllers.importWorkOrderExecutions);
router.put('/:id', requireScope('write:executions'), trackApiUsage, authenticateToken, controllers.updateWorkOrderExecution);
router.delete('/:id', authenticateToken, requireScope('delete:executions'), trackApiUsage, controllers.deleteWorkOrderExecution);
router.get('/', authenticateToken, requireScope('read:executions'), trackApiUsage, controllers.getWorkOrderExecutions);

module.exports = router;

