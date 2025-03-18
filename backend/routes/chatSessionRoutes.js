// routes/chatSessionRoutes.js
const express = require('express');
const router = express.Router();
const chatSessionController = require('../controllers/chatsessionController');
const { authenticateToken } = require('../services/authToken');

// Get chat history for current user
router.get('/history', authenticateToken, chatSessionController.getChatHistory);

// Save message to chat history
router.post('/message', authenticateToken, chatSessionController.saveMessage);

// Clear chat history
router.post('/clear', authenticateToken, chatSessionController.clearChatHistory);

module.exports = router;