const Blocker = require('../models/Blocker');
const ActionItem = require('../models/ActionItem');
const { WorkOrder } = require('../models/Workorder');
const SalesOrder = require('../models/SalesOrder');
const Part = require('../models/Part');

// Utility function to update blockerTag for WorkOrders, SalesOrders, and Parts
async function updateBlockerTags(blocker) {
  // For each related document type, check if any open blockers exist for that document.
  // If none exist, set blockerTag = false; otherwise, true.

  // 1. WorkOrders
  if (blocker.relatedWorkOrders && blocker.relatedWorkOrders.length > 0) {
    for (const woId of blocker.relatedWorkOrders) {
      const openBlockersCount = await Blocker.countDocuments({
        relatedWorkOrders: woId,
        status: { $ne: 'Closed' }  // not closed means open or in-progress
      });
      await WorkOrder.findByIdAndUpdate(woId, {
        blockerTag: openBlockersCount > 0
      });
    }
  }

  // 2. SalesOrders
  if (blocker.relatedSalesOrders && blocker.relatedSalesOrders.length > 0) {
    for (const soId of blocker.relatedSalesOrders) {
      const openBlockersCount = await Blocker.countDocuments({
        relatedSalesOrders: soId,
        status: { $ne: 'Closed' }
      });
      await SalesOrder.findByIdAndUpdate(soId, {
        blockerTag: openBlockersCount > 0
      });
    }
  }

  // 3. Parts
  if (blocker.relatedParts && blocker.relatedParts.length > 0) {
    for (const partId of blocker.relatedParts) {
      const openBlockersCount = await Blocker.countDocuments({
        relatedParts: partId,
        status: { $ne: 'Closed' }
      });
      await Part.findByIdAndUpdate(partId, {
        blockerTag: openBlockersCount > 0
      });
    }
  }
}

// CREATE Blocker
exports.createBlocker = async (req, res) => {
  try {
    const { title, description, type, relatedWorkOrders, relatedSalesOrders, relatedParts } = req.body;
    
    const newBlocker = await Blocker.create({
      title,
      description,
      type,
      status: 'Open',
      relatedWorkOrders,
      relatedSalesOrders,
      relatedParts
    });

    // Since it's a new blocker with status = 'Open', we need to set the blockerTag = true on all related docs.
    await updateBlockerTags(newBlocker);

    res.status(201).json(newBlocker);
  } catch (err) {
    console.error('Error creating blocker:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// -----------------------
// GET All Blockers
// -----------------------
exports.getBlockers = async (req, res) => {
    console.log(' am here');
  try {
    // Optionally, you could parse query parameters for filtering.
    // e.g. ?status=Open or ?type=Risk
    const filters = { ...req.query }; // naive approach, refine for security
    console.log('filters', filters);
    const blockers = await Blocker.find(filters).exec();

    res.status(200).json(blockers);
  } catch (err) {
    console.error('Error fetching blockers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// -----------------------
// GET a single Blocker by ID
// -----------------------
exports.getBlockerById = async (req, res) => {
  try {
    const blockerId = req.params.id;
    const blocker = await Blocker.findById(blockerId).exec();

    if (!blocker) {
      return res.status(404).json({ error: 'Blocker not found' });
    }

    res.status(200).json(blocker);
  } catch (err) {
    console.error('Error fetching blocker by ID:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// UPDATE Blocker
exports.updateBlocker = async (req, res) => {
  try {
    const blockerId = req.params.id;
    const updates = req.body; // e.g. { status, title, description, relatedWorkOrders, etc. }

    // Update the blocker
    const updatedBlocker = await Blocker.findByIdAndUpdate(blockerId, updates, { new: true });

    // If we changed the status or references, we need to update blockerTag accordingly
    if (updatedBlocker) {
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

// DELETE Blocker
exports.deleteBlocker = async (req, res) => {
  try {
    const blockerId = req.params.id;

    const deletedBlocker = await Blocker.findByIdAndDelete(blockerId);
    if (!deletedBlocker) {
      return res.status(404).json({ error: 'Blocker not found' });
    }

    // After deleting the blocker, the references might no longer have this "open" or "closed" risk/issue.
    // So let's update their blockerTag:
    await updateBlockerTags(deletedBlocker);

    // Optionally, you might also want to delete or orphan the associated ActionItems:
    // await ActionItem.deleteMany({ blockerId: blockerId });

    res.status(200).json({ message: 'Blocker deleted successfully' });
  } catch (err) {
    console.error('Error deleting blocker:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

