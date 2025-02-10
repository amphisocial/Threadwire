// models/ActionItem.js

const mongoose = require('mongoose');

const ActionItemSchema = new mongoose.Schema({
  blockerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blocker',
    required: true,
  },
  actionItem: { type: String, required: true },
  assignedTo: { type: String, required: true },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Completed'],
    default: 'Open'
  },
  remark: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('ActionItem', ActionItemSchema);
