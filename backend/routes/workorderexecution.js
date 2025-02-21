
const express = require('express');
const router = express.Router();
const controllers = require('../controllers/workorderexecutionController');
const { authenticateToken } = require('../services/authToken')


// WorkOrderExecution Routes
router.post('/', authenticateToken, controllers.createWorkOrderExecution);
router.post('/import', authenticateToken, controllers.importWorkOrderExecutions);
router.put('/:id', authenticateToken, controllers.updateWorkOrderExecution);
router.delete('/:id', authenticateToken, controllers.deleteWorkOrderExecution);
router.get('/', authenticateToken, controllers.getWorkOrderExecutions);

module.exports = router;

