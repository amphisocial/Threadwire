
const express = require('express');
const router = express.Router();
const apiAnalyticsController = require('../controllers/apiAnalyticsController');
const { authenticateToken } = require('../services/authToken');
const { requirePowerUser } = require('../services/powerUserAuth');

// Only power users can access analytics
router.use(authenticateToken);
router.use(requirePowerUser);

// Get detailed API usage logs
router.get('/usage', apiAnalyticsController.getApiUsage);

// Get API usage summary (aggregated data)
router.get('/summary', apiAnalyticsController.getApiSummary);

module.exports = router;