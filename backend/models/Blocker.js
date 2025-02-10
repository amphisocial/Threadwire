const mongoose = require('mongoose');

const BlockerSchema = new mongoose.Schema({
  title: { type: String, required: true },          // Short title or summary
  description: { type: String },                    // Detailed description
  priority: { type: String, enum: ['Low','Medium','High'], default: 'Low' },                    // Priority
  type: {                                           // "Risk" or "Issue" or possibly more
    type: String,
    enum: ['Risk', 'Issue'],
    default: 'Issue'
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Closed'],
    default: 'Open'
  },
  // If you want to track who created the blocker or any other metadata, add it here.
  
  // References to related documents:
  relatedWorkOrders: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' }
  ],
  relatedSalesOrders: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' }
  ],
  relatedParts: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Part' }
  ],
  
}, { timestamps: true });

module.exports = mongoose.model('Blocker', BlockerSchema);
