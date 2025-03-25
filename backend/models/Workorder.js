const mongoose = require('mongoose');

// WorkOrder Schema
const WorkOrderSchema = new mongoose.Schema({
  workorder: { type: String, required: true, unique: true },
  type: { type: String, enum: ['Production', 'Maintenance', 'Service', 'Repair'], required: true },
  description: { type: String },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
  status: { type: String, enum: ['Open', 'In-progress', 'Completed', 'Closed'], required: true },
  dateCreated: { type: Date, default: Date.now },
  dateModified: { type: Date, default: Date.now },
  partnumber: { type: String, required: true },
  estCost: { type: Number },
  actualCost: { type: Number },
  blockerTag: { type: Number },
  quantity: { type: Number },
  salesorder: { type: String },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
});

const WorkOrder = mongoose.model('WorkOrder', WorkOrderSchema);

// PartBoP Schema
const PartBoPSchema = new mongoose.Schema({
  partnumber: { type: String, required: true },
  operation: { type: String },
  opcode: { type: String },
  sequence: { type: Number },
  planner: { type: String },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
});

const PartBoP = mongoose.model('PartBoP', PartBoPSchema,'partbop');


module.exports = { WorkOrder, PartBoP };

