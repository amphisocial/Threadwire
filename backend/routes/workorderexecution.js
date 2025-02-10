
const express = require('express');
const router = express.Router();
const controllers = require('../controllers/workorderexecutionController');

// WorkOrderExecution Routes
router.post('/', controllers.createWorkOrderExecution);
router.post('/import', controllers.importWorkOrderExecutions);
router.put('/:id', controllers.updateWorkOrderExecution);
router.delete('/:d', controllers.deleteWorkOrderExecution);
router.get('/', controllers.getWorkOrderExecutions);

module.exports = router;

