// routes/chatbotRoutes.js
const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { authenticateToken } = require('../services/authToken'); // Your existing auth middleware

// Main chatbot endpoint for queries
router.post('/chat', authenticateToken, chatbotController.chatQuery);

// Get metadata for filters and document types
router.get('/metadata', authenticateToken, chatbotController.getMetadata);

// Test connection to vector database
router.get('/test-connection', authenticateToken, chatbotController.testVectorConnection);

// Advanced search with detailed results (useful for debugging)
router.post('/advanced-search', authenticateToken, chatbotController.advancedSearch);

module.exports = router;