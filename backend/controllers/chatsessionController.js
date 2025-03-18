// controllers/chatSessionController.js
const ChatSession = require('../models/ChatSession');

// Get chat history for a user
exports.getChatHistory = async (req, res) => {
  try {
    // Get userId as a string
    const userId = String(req.user.id);
    const isGoogleUser = req.user.isGoogleUser === true;
    
    // Find the most recent chat session for this user
    const chatSession = await ChatSession.findOne({ userId })
      .sort({ updatedAt: -1 })
      .limit(1);
    
    if (!chatSession) {
      // Create an empty session to use for this user
      const newSession = new ChatSession({
        userId,
        authType: isGoogleUser ? 'google' : 'jwt',
        messages: []
      });
      
      await newSession.save();
      
      return res.json({ 
        messages: [], 
        sessionId: newSession._id 
      });
    }
    
    res.json({ 
      messages: chatSession.messages,
      sessionId: chatSession._id 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching chat history' });
  }
};

// Save message to chat history
exports.saveMessage = async (req, res) => {
  try {
    // Get userId as a string
    const userId = String(req.user.id);
    const isGoogleUser = req.user.isGoogleUser === true;
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Ensure all required fields are present
    if (!message.text || !message.type || !message.timestamp) {
      return res.status(400).json({ 
        error: 'Message must include text, type, and timestamp fields' 
      });
    }
    
    let chatSession;
    
    // If session ID provided, update that session
    if (sessionId) {
      chatSession = await ChatSession.findById(sessionId);
      
      // If session not found with that ID, look up the most recent session for this user
      if (!chatSession) {
        chatSession = await ChatSession.findOne({ userId })
          .sort({ updatedAt: -1 })
          .limit(1);
      }
      
      // Verify the session belongs to this user if found
      if (chatSession && chatSession.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to chat session' });
      }
    } else {
      // No session ID provided, find the most recent session for this user
      chatSession = await ChatSession.findOne({ userId })
        .sort({ updatedAt: -1 })
        .limit(1);
    }
    
    // If no existing session found, create a new one
    if (!chatSession) {
      chatSession = new ChatSession({
        userId,
        authType: isGoogleUser ? 'google' : 'jwt',
        messages: []
      });
    }
    
    // Format timestamp as Date if it's a string
    if (typeof message.timestamp === 'string') {
      message.timestamp = new Date(message.timestamp);
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
    res.status(500).json({ error: 'Error saving chat message' });
  }
};

// Clear chat history for a user
exports.clearChatHistory = async (req, res) => {
  try {
    const userId = String(req.user.id);
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
    res.status(500).json({ error: 'Error clearing chat history' });
  }
};