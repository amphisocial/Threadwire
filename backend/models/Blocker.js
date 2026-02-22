/**
 * =============================================================================
 * Blocker Model
 * =============================================================================
 * Schema for Risk/Issue blockers that can be associated with Sales Orders,
 * Work Orders, and Parts.
 * 
 * Features:
 * - Links to multiple related entities (many-to-many relationships)
 * - Tracks status, priority, type (Risk/Issue)
 * - Assigned user tracking
 * - Estimated completion date for planning
 * - Closed date for tracking when blocker was resolved
 * 
 * Updated: February 2, 2026
 * - Added estimatedCompletionDate field for planning purposes
 * - Added closedDate field to track when blocker was closed
 * =============================================================================
 */

const mongoose = require('mongoose');

const BlockerSchema = new mongoose.Schema({
  // Title of the blocker (required)
  title: { 
    type: String, 
    required: true 
  },
  
  // Detailed description of the blocker
  description: { 
    type: String 
  },
  
  // Priority level: Low, Medium, or High
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High'], 
    default: 'Low' 
  },
  
  // Type of blocker: Risk (potential issue) or Issue (actual problem)
  type: {
    type: String,
    enum: ['Risk', 'Issue'],
    default: 'Issue'
  },
  
  // Current status of the blocker
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Closed'],
    default: 'Open'
  },
  
  // Estimated date when the blocker is expected to be resolved
  // Used for planning and tracking purposes
  estimatedCompletionDate: {
    type: Date
  },
  
  // Actual date when the blocker was closed
  // Set automatically when status changes to 'Closed'
  closedDate: {
    type: Date
  },
  
  // Related Work Orders (many-to-many relationship)
  relatedWorkOrders: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' }
  ],
  
  // Related Sales Orders (many-to-many relationship)
  relatedSalesOrders: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' }
  ],
  
  // Related Parts (many-to-many relationship)
  relatedParts: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Part' }
  ],
  
  // User assigned to resolve this blocker
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Company/Customer this blocker belongs to (multi-tenant support)
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
  
}, { 
  // Automatically add createdAt and updatedAt timestamps
  timestamps: true 
});

module.exports = mongoose.model('Blocker', BlockerSchema);
