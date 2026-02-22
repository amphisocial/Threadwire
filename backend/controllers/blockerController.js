/**
 * =============================================================================
 * Blocker Controller
 * =============================================================================
 * Handles all CRUD operations for Blockers (Risk/Issues).
 * 
 * Features:
 * - Create, Read, Update, Delete blockers
 * - Automatically updates blockerTag on related entities (Sales Orders, 
 *   Work Orders, Parts) when blocker status changes
 * - Close blocker endpoint with automatic date tracking
 * - Multi-tenant support via customerId
 * 
 * Updated: February 6, 2026
 * - Added add/remove functions for related Sales Orders and Work Orders
 * - Added closeBlocker endpoint for quick close with current date
 * - Auto-set closedDate when status changes to 'Closed'
 * - Support for estimatedCompletionDate field
 * =============================================================================
 */

const Blocker = require('../models/Blocker');
const ActionItem = require('../models/ActionItem');
const { WorkOrder } = require('../models/Workorder');
const SalesOrder = require('../models/SalesOrder');
const Part = require('../models/Part');

/**
 * Update blockerTag for WorkOrders, SalesOrders, and Parts
 * 
 * This function checks if any OPEN blockers exist for each related entity.
 * If no open blockers exist, blockerTag is set to false (0).
 * If any open blockers exist, blockerTag is set to true (1).
 * 
 * This ensures:
 * - B3: Sales order can only be "unblocked" when ALL blockers are closed
 * - B4: If ANY blocker is still open, sales order remains blocked
 * 
 * @param {Object} blocker - The blocker document with relatedWorkOrders, 
 *                           relatedSalesOrders, and relatedParts arrays
 */
async function updateBlockerTags(blocker) {
  const customerId = blocker.customerId;

  // 1. Update WorkOrders blockerTag
  if (blocker.relatedWorkOrders && blocker.relatedWorkOrders.length > 0) {
    for (const woId of blocker.relatedWorkOrders) {
      const workOrder = await WorkOrder.findOne({ _id: woId, customerId });
      if (!workOrder) continue;

      // Count how many OPEN blockers are associated with this work order
      const openBlockersCount = await Blocker.countDocuments({
        relatedWorkOrders: woId,
        status: { $ne: 'Closed' },
        customerId
      });

      // Set blockerTag: true (1) if any open, false (0) if all closed
      await WorkOrder.findByIdAndUpdate(woId, {
        blockerTag: openBlockersCount > 0
      });
    }
  }

  // 2. Update SalesOrders blockerTag
  if (blocker.relatedSalesOrders && blocker.relatedSalesOrders.length > 0) {
    for (const soId of blocker.relatedSalesOrders) {
      const salesOrder = await SalesOrder.findOne({ _id: soId, customerId });
      if (!salesOrder) continue;

      // Count how many OPEN blockers are associated with this sales order
      const openBlockersCount = await Blocker.countDocuments({
        relatedSalesOrders: soId,
        status: { $ne: 'Closed' },
        customerId
      });

      // Set blockerTag: true (1) if any open, false (0) if all closed
      await SalesOrder.findByIdAndUpdate(soId, {
        blockerTag: openBlockersCount > 0
      });
    }
  }

  // 3. Update Parts blockerTag
  if (blocker.relatedParts && blocker.relatedParts.length > 0) {
    for (const partId of blocker.relatedParts) {
      const part = await Part.findOne({ _id: partId, customerId });
      if (!part) continue;

      // Count how many OPEN blockers are associated with this part
      const openBlockersCount = await Blocker.countDocuments({
        relatedParts: partId,
        status: { $ne: 'Closed' },
        customerId
      });

      // Set blockerTag: true (1) if any open, false (0) if all closed
      await Part.findByIdAndUpdate(partId, {
        blockerTag: openBlockersCount > 0
      });
    }
  }
}

// Export for use in other controllers (e.g., actionItemController)
exports.updateBlockerTags = updateBlockerTags;

/**
 * CREATE a new Blocker
 * POST /api/blockers
 * 
 * Body: { title, description, type, priority, estimatedCompletionDate,
 *         relatedWorkOrders, relatedSalesOrders, relatedParts, assignedTo }
 */
exports.createBlocker = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      type, 
      priority,
      estimatedCompletionDate,
      relatedWorkOrders, 
      relatedSalesOrders, 
      relatedParts,
      assignedTo
    } = req.body;
    
    const customerId = req.user?.customerId || req.customer?.id;

    // Create the new blocker with status = 'Open'
    const newBlocker = await Blocker.create({
      title,
      description,
      type,
      priority,
      status: 'Open',
      estimatedCompletionDate: estimatedCompletionDate || null,
      relatedWorkOrders,
      relatedSalesOrders,
      relatedParts,
      assignedTo,
      customerId
    });

    // Since it's a new blocker with status = 'Open', 
    // set blockerTag = true on all related entities
    await updateBlockerTags(newBlocker);

    res.status(201).json(newBlocker);
  } catch (err) {
    console.error('Error creating blocker:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET all Blockers for the current customer
 * GET /api/blockers
 * 
 * Optional query params for filtering: ?status=Open&type=Risk
 */
exports.getBlockers = async (req, res) => {
  try {
    const customerId = req.user?.customerId || req.customer?.id;

    const filters = { 
      ...req.query,
      customerId 
    };

    const blockers = await Blocker.find(filters)
      .populate('assignedTo', 'name email')
      .populate('relatedSalesOrders', 'ordernumber amount')
      .exec();

    res.status(200).json(blockers);
  } catch (err) {
    console.error('Error fetching blockers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET a single Blocker by ID
 * GET /api/blockers/:id
 */
exports.getBlockerById = async (req, res) => {
  try {
    const blockerId = req.params.id;
    const customerId = req.user?.customerId || req.customer?.id;

    const blocker = await Blocker.findOne({
      _id: blockerId,
      customerId
    })
    .populate('assignedTo', 'name email')
    .exec();

    if (!blocker) {
      return res.status(404).json({ error: 'Blocker not found' });
    }

    res.status(200).json(blocker);
  } catch (err) {
    console.error('Error fetching blocker by ID:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * UPDATE a Blocker
 * PUT /api/blockers/:id
 * 
 * Body: { status, title, description, estimatedCompletionDate, 
 *         relatedWorkOrders, etc. }
 * 
 * Automatically sets closedDate when status changes to 'Closed'
 */
exports.updateBlocker = async (req, res) => {
  try {
    const blockerId = req.params.id;
    const customerId = req.user?.customerId || req.customer?.id;
    const updates = req.body;

    // Verify blocker exists and belongs to this customer
    const existingBlocker = await Blocker.findOne({
      _id: blockerId,
      customerId
    });
    
    if (!existingBlocker) {
      return res.status(404).json({ 
        error: 'Blocker not found or you do not have permission' 
      });
    }
    
    // Don't allow customerId to be changed
    delete updates.customerId;

    // If status is being changed to 'Closed', set closedDate automatically
    if (updates.status === 'Closed' && existingBlocker.status !== 'Closed') {
      updates.closedDate = new Date();
    }
    
    // If status is being changed FROM 'Closed' to something else, clear closedDate
    if (updates.status && updates.status !== 'Closed' && existingBlocker.status === 'Closed') {
      updates.closedDate = null;
    }

    // Update the blocker
    const updatedBlocker = await Blocker.findByIdAndUpdate(
      blockerId, 
      updates, 
      { new: true }
    ).populate('assignedTo', 'name email');

    if (updatedBlocker) {
      // Update blockerTag on all related entities
      await updateBlockerTags(updatedBlocker);
      res.status(200).json(updatedBlocker);
    } else {
      res.status(404).json({ error: 'Blocker not found' });
    }
  } catch (err) {
    console.error('Error updating blocker:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * CLOSE a Blocker (Quick close endpoint)
 * PUT /api/blockers/:id/close
 * 
 * Sets status to 'Closed' and closedDate to current date/time.
 * This is a convenience endpoint for the "Close" button.
 */
exports.closeBlocker = async (req, res) => {
  try {
    const blockerId = req.params.id;
    const customerId = req.user?.customerId || req.customer?.id;

    // Verify blocker exists and belongs to this customer
    const existingBlocker = await Blocker.findOne({
      _id: blockerId,
      customerId
    });
    
    if (!existingBlocker) {
      return res.status(404).json({ 
        error: 'Blocker not found or you do not have permission' 
      });
    }

    // Check if already closed
    if (existingBlocker.status === 'Closed') {
      return res.status(400).json({ 
        error: 'Blocker is already closed' 
      });
    }

    // Close the blocker with current date
    const updatedBlocker = await Blocker.findByIdAndUpdate(
      blockerId,
      { 
        status: 'Closed',
        closedDate: new Date()
      },
      { new: true }
    ).populate('assignedTo', 'name email');

    if (updatedBlocker) {
      // Update blockerTag on all related entities
      // Since this blocker is now closed, related entities may become unblocked
      await updateBlockerTags(updatedBlocker);
      
      res.status(200).json({
        message: 'Blocker closed successfully',
        blocker: updatedBlocker
      });
    } else {
      res.status(404).json({ error: 'Blocker not found' });
    }
  } catch (err) {
    console.error('Error closing blocker:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE a Blocker
 * DELETE /api/blockers/:id
 * 
 * Also updates blockerTag on related entities after deletion.
 */
exports.deleteBlocker = async (req, res) => {
  try {
    const blockerId = req.params.id;
    const customerId = req.user?.customerId || req.customer?.id;

    // Verify blocker exists and belongs to this customer
    const existingBlocker = await Blocker.findOne({
      _id: blockerId,
      customerId
    });
    
    if (!existingBlocker) {
      return res.status(404).json({ 
        error: 'Blocker not found or you do not have permission' 
      });
    }

    // Store a copy for updating tags after deletion
    const blockerCopy = { ...existingBlocker.toObject() };

    // Delete the blocker
    const deletedBlocker = await Blocker.findByIdAndDelete(blockerId);
    if (!deletedBlocker) {
      return res.status(404).json({ error: 'Blocker not found' });
    }

    // Update blockerTag on related entities
    // Since this blocker is deleted, related entities may become unblocked
    await updateBlockerTags(deletedBlocker);

    // Optionally delete associated ActionItems (uncomment if desired)
    // await ActionItem.deleteMany({ blockerId: blockerId });

    res.status(200).json({ message: 'Blocker deleted successfully' });
  } catch (err) {
    console.error('Error deleting blocker:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * =============================================================================
 * ADD/REMOVE Related Items Functions
 * =============================================================================
 * Functions for managing many-to-many relationships between blockers and
 * related entities (Sales Orders, Work Orders)
 * 
 * Added: February 6, 2026
 * =============================================================================
 */

/**
 * ADD a Sales Order to a Blocker
 * PUT /api/blockers/:id/add-salesorder
 * Body: { salesOrderId: "..." }
 */
exports.addRelatedSalesOrder = async (req, res) => {
  try {
    const blockerId = req.params.id;
    const { salesOrderId } = req.body;
    const customerId = req.user?.customerId || req.customer?.id;

    if (!salesOrderId) {
      return res.status(400).json({ error: 'salesOrderId is required' });
    }

    // Verify blocker exists and belongs to this customer
    const blocker = await Blocker.findOne({
      _id: blockerId,
      customerId
    });

    if (!blocker) {
      return res.status(404).json({ 
        error: 'Blocker not found or you do not have permission' 
      });
    }

    // Add sales order to the array (using $addToSet to avoid duplicates)
    const updatedBlocker = await Blocker.findByIdAndUpdate(
      blockerId,
      { $addToSet: { relatedSalesOrders: salesOrderId } },
      { new: true }
    )
      .populate('assignedTo', 'name email')
      .populate('relatedSalesOrders', 'ordernumber amount');

    // Update blockerTag on all related entities
    await updateBlockerTags(updatedBlocker);

    res.status(200).json(updatedBlocker);
  } catch (err) {
    console.error('Error adding sales order to blocker:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * REMOVE a Sales Order from a Blocker
 * PUT /api/blockers/:id/remove-salesorder
 * Body: { salesOrderId: "..." }
 */
exports.removeRelatedSalesOrder = async (req, res) => {
  try {
    const blockerId = req.params.id;
    const { salesOrderId } = req.body;
    const customerId = req.user?.customerId || req.customer?.id;

    if (!salesOrderId) {
      return res.status(400).json({ error: 'salesOrderId is required' });
    }

    // Verify blocker exists and belongs to this customer
    const blocker = await Blocker.findOne({
      _id: blockerId,
      customerId
    });

    if (!blocker) {
      return res.status(404).json({ 
        error: 'Blocker not found or you do not have permission' 
      });
    }

    // Remove sales order from the array
    const updatedBlocker = await Blocker.findByIdAndUpdate(
      blockerId,
      { $pull: { relatedSalesOrders: salesOrderId } },
      { new: true }
    )
      .populate('assignedTo', 'name email')
      .populate('relatedSalesOrders', 'ordernumber amount');

    // Update blockerTag on all related entities
    await updateBlockerTags(updatedBlocker);

    res.status(200).json(updatedBlocker);
  } catch (err) {
    console.error('Error removing sales order from blocker:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * ADD a Work Order to a Blocker
 * PUT /api/blockers/:id/add-workorder
 * Body: { workOrderId: "..." }
 */
exports.addRelatedWorkOrder = async (req, res) => {
  try {
    const blockerId = req.params.id;
    const { workOrderId } = req.body;
    const customerId = req.user?.customerId || req.customer?.id;

    if (!workOrderId) {
      return res.status(400).json({ error: 'workOrderId is required' });
    }

    // Verify blocker exists and belongs to this customer
    const blocker = await Blocker.findOne({
      _id: blockerId,
      customerId
    });

    if (!blocker) {
      return res.status(404).json({ 
        error: 'Blocker not found or you do not have permission' 
      });
    }

    // Add work order to the array (using $addToSet to avoid duplicates)
    const updatedBlocker = await Blocker.findByIdAndUpdate(
      blockerId,
      { $addToSet: { relatedWorkOrders: workOrderId } },
      { new: true }
    )
      .populate('assignedTo', 'name email')
      .populate('relatedSalesOrders', 'ordernumber amount');

    // Update blockerTag on all related entities
    await updateBlockerTags(updatedBlocker);

    res.status(200).json(updatedBlocker);
  } catch (err) {
    console.error('Error adding work order to blocker:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * REMOVE a Work Order from a Blocker
 * PUT /api/blockers/:id/remove-workorder
 * Body: { workOrderId: "..." }
 */
exports.removeRelatedWorkOrder = async (req, res) => {
  try {
    const blockerId = req.params.id;
    const { workOrderId } = req.body;
    const customerId = req.user?.customerId || req.customer?.id;

    if (!workOrderId) {
      return res.status(400).json({ error: 'workOrderId is required' });
    }

    // Verify blocker exists and belongs to this customer
    const blocker = await Blocker.findOne({
      _id: blockerId,
      customerId
    });

    if (!blocker) {
      return res.status(404).json({ 
        error: 'Blocker not found or you do not have permission' 
      });
    }

    // Remove work order from the array
    const updatedBlocker = await Blocker.findByIdAndUpdate(
      blockerId,
      { $pull: { relatedWorkOrders: workOrderId } },
      { new: true }
    )
      .populate('assignedTo', 'name email')
      .populate('relatedSalesOrders', 'ordernumber amount');

    // Update blockerTag on all related entities
    await updateBlockerTags(updatedBlocker);

    res.status(200).json(updatedBlocker);
  } catch (err) {
    console.error('Error removing work order from blocker:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
