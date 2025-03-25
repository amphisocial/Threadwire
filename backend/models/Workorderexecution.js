
const mongoose = require('mongoose');

// WorkOrderExecution Schema
const WorkOrderExecutionSchema = new mongoose.Schema({
  workorder: { type: String, required: true },
  serialNumber: { type: String, required: true },
  timeIn: { type: Date },
  timeOut: { type: Date },
  operation: { type: String },
  partnumber: { type: String, required: true },
  status: { type: String },
  operator: { type: String },
  location: { type: String },
  priority: { type: String },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
});

const WorkOrderExecution = mongoose.model('WorkOrderExecution', WorkOrderExecutionSchema, 'workorderexecution');

module.exports = { WorkOrderExecution };

