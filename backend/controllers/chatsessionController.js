// controllers/chatSessionController.js
const mongoose = require('mongoose');
const ChatSession = require('../models/ChatSession');

// Get chat history for a user
exports.getChatHistory = async (req, res) => {
  try {
    const userId = req.user.id; 
    
    // Find the most recent chat session for this user
    const chatSession = await ChatSession.findOne({ userId })
      .sort({ updatedAt: -1 })
      .limit(1);
    
    if (!chatSession) {
      return res.json({ messages: [] });
    }
    
    res.json({ 
      messages: chatSession.messages,
      sessionId: chatSession._id 
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Error fetching chat history' });
  }
};

// Save message to chat history
exports.saveMessage = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming user ID is attached by auth middleware
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    let chatSession;
    
    // If session ID provided, update that session
    if (sessionId) {
      chatSession = await ChatSession.findById(sessionId);
      
      // Verify the session belongs to this user
      if (chatSession && chatSession.userId.toString() !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to chat session' });
      }
    }
    
    // If no existing session found, create a new one
    if (!chatSession) {
      chatSession = new ChatSession({
        userId,
        messages: []
      });
    }
    
    // Add the new message
    chatSession.messages.push(message);
    
    // Update timestamps
    chatSession.updatedAt = new Date();
    
    // Save the session
    await chatSession.save();
    
    res.json({ 
      success: true, 
      sessionId: chatSession._id,
      messageCount: chatSession.messages.length
    });
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ error: 'Error saving chat message' });
  }
};

// Clear chat history for a user
exports.clearChatHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.body;
    
    // If session ID provided, clear just that session
    if (sessionId) {
      const result = await ChatSession.findOneAndUpdate(
        { _id: sessionId, userId },
        { $set: { messages: [] } },
        { new: true }
      );
      
      if (!result) {
        return res.status(404).json({ error: 'Chat session not found' });
      }
    } else {
      // Clear all sessions for this user
      await ChatSession.updateMany(
        { userId },
        { $set: { messages: [] } }
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ error: 'Error clearing chat history' });
  }
};