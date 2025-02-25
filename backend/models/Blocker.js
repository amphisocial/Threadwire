const mongoose = require('mongoose');

const BlockerSchema = new mongoose.Schema({
  title: { type: String, required: true },          
  description: { type: String },                    
  priority: { type: String, enum: ['Low','Medium','High'], default: 'Low' },   
  type: {                              
    type: String,
    enum: ['Risk', 'Issue'],
    default: 'Issue'
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Closed'],
    default: 'Open'
  },

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
