const express = require('express');
const router = express.Router();
const { getSalesOrders, editSalesOrder, importSalesOrders } = require('../controllers/salesordersController');
const { authenticateToken } = require('../services/authToken')
const trackApiUsage = require('../services/apiUsageTracker');



// Define endpoints
router.get('/', authenticateToken, requireScope('read:sales'), trackApiUsage, getSalesOrders);
router.post('/', authenticateToken, requireScope('write:sales'), trackApiUsage, editSalesOrder);
router.post('/import', authenticateToken, requireScope('write:sales'), trackApiUsage,importSalesOrders);

module.exports = router;

