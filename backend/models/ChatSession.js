// models/ChatSession.js
const mongoose = require('mongoose');

const ChatSessionSchema = new mongoose.Schema({
  userId: {
    type: String, 
    required: true,
    index: true
  },
  messages: [
    {
      text: String,
      type: {
        type: String,
        enum: ['user', 'bot', 'error'],
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Optional: Add session expiry - sessions will expire after 30 days by default
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 30*24*60*60*1000) // 30 days from now
  }
}, { timestamps: true });

// Add TTL index if you want sessions to expire automatically
ChatSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Add index on updatedAt for efficiently retrieving the most recent sessions
ChatSessionSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('ChatSession', ChatSessionSchema);