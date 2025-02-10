const express = require('express');
const router = express.Router();
const controllers = require('../controllers/workorderController');

// WorkOrder Routes
router.post('/', controllers.createWorkOrder);
router.post('/import', controllers.importWorkorders);
router.put('/:id', controllers.updateWorkOrder);
router.delete('/:id', controllers.deleteWorkOrder);
router.get('/', controllers.getWorkOrders);

module.exports = router;

