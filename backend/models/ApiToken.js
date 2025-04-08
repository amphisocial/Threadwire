const mongoose = require('mongoose');

const apiTokenSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  tokenIdentifier: { 
    type: String,
    required: true,
    unique: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scopes: [{
    type: String
  }],
  expiresAt: {
    type: Date,
    required: true
  },
  lastUsed: {
    type: Date
  },
  isRevoked: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const ApiToken = mongoose.model('ApiToken', apiTokenSchema);
module.exports = ApiToken;