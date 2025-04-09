// routes/chatbotRoutes.js
const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { authenticateToken, requireScope } = require('../services/authToken'); // Your existing auth middleware
const trackApiUsage = require('../services/apiUsageTracker');


// Main chatbot endpoint for queries
router.post('/chat', authenticateToken, requireScope('use:chatbot'), trackApiUsage, chatbotController.chatQuery);

// Get metadata for filters and document types
router.get('/metadata', authenticateToken, chatbotController.getMetadata);

// Test connection to vector database
router.get('/test-connection', authenticateToken, chatbotController.testVectorConnection);

// Advanced search with detailed results (useful for debugging)
router.post('/advanced-search', authenticateToken, chatbotController.advancedSearch);

module.exports = router;
