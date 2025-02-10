const express = require('express');
const router = express.Router();
const { getSalesOrders, editSalesOrder, importSalesOrders } = require('../controllers/salesordersController');

// Define endpoints
router.get('/', getSalesOrders);
router.post('/', editSalesOrder);
router.post('/import',importSalesOrders);

module.exports = router;

