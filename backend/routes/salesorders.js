const express = require('express');
const router = express.Router();
const { getSalesOrders, editSalesOrder, importSalesOrders } = require('../controllers/salesordersController');
const { authenticateToken } = require('../services/authToken')


// Define endpoints
router.get('/', authenticateToken, getSalesOrders);
router.post('/', authenticateToken, editSalesOrder);
router.post('/import', authenticateToken,importSalesOrders);

module.exports = router;

