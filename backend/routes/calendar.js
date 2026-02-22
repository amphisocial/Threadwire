const express = require('express');
const router = express.Router();
const { getCalendarOrders, updateOrderStatus } = require('../controllers/calendarController');
const { authenticateToken, requireScope } = require('../services/authToken');
const trackApiUsage = require('../services/apiUsageTracker');

// GET /api/calendar?type=salesorders&startDate=2026-01-12&endDate=2026-01-18
router.get('/', authenticateToken, requireScope('read:sales'), trackApiUsage, getCalendarOrders);

// PUT /api/calendar/status
router.put('/status', authenticateToken, requireScope('write:sales'), trackApiUsage, updateOrderStatus);

module.exports = router;
