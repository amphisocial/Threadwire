const express = require('express');
const router = express.Router();
const controllers = require('../controllers/workorderController');
const { authenticateToken } = require('../services/authToken')

// WorkOrder Routes
router.post('/', authenticateToken, controllers.createWorkOrder);
router.post('/import', authenticateToken, controllers.importWorkorders);
router.put('/:id', authenticateToken, controllers.updateWorkOrder);
router.delete('/:id', authenticateToken, controllers.deleteWorkOrder);
router.get('/', authenticateToken, controllers.getWorkOrders);

module.exports = router;

