const mongoose = require('mongoose');

const apiUsageSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  tokenName: {
    type: String
  },
  endpoint: {
    type: String,
    required: true
  },
  method: {
    type: String,
    required: true
  },
  statusCode: {
    type: Number
  },
  responseTime: {
    type: Number // in milliseconds
  }
}, { timestamps: true });

const ApiUsage = mongoose.model('ApiUsage', apiUsageSchema);
module.exports = ApiUsage;