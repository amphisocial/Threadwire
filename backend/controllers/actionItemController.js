// controllers/actionItemController.js

const ActionItem = require('../models/ActionItem');
const Blocker = require('../models/Blocker');
const WorkOrder = require('../models/Workorder');
const SalesOrder = require('../models/SalesOrder');
const Part = require('../models/Part');

// A helper to check if all action items for a blocker are completed
async function checkAndCloseBlocker(blockerId) {
  // Count how many action items for this blocker are NOT completed
  const notCompletedCount = await ActionItem.countDocuments({
    blockerId,
    status: { $ne: 'Completed' },
  });

  if (notCompletedCount === 0) {
    // All action items completed => set blocker to "Closed"
    const blocker = await Blocker.findByIdAndUpdate(blockerId, {
      status: 'Closed'
    }, { new: true });

    // Possibly update the related WorkOrders / SalesOrders / Parts
    if (blocker) {
      // Because the status changed to 'Closed', update blockerTag references
      // (similar logic as in the `updateBlockerTags` function)
      // You can re-use the same function from the Blocker controller if you want:
      const blockerController = require('./blockerController');
      await blockerController.updateBlockerTags(blocker);
    }
  }
}

exports.createActionItem = async (req, res) => {
  try {
    const { blockerId, actionItem, assignedTo } = req.body;

    const newActionItem = await ActionItem.create({
      blockerId,
      actionItem,
      assignedTo,
      status: 'Open'
    });

    res.status(201).json(newActionItem);
  } catch (err) {
    console.error('Error creating action item:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateActionItem = async (req, res) => {
  try {
    const actionItemId = req.params.id;
    const updates = req.body; // e.g. { status: 'Completed', remark: 'Done' }

    const updatedActionItem = await ActionItem.findByIdAndUpdate(actionItemId, updates, { new: true });
    if (!updatedActionItem) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    // If the updated status is "Completed", we should check if all action items for that blocker are completed
    if (updatedActionItem.status === 'Completed') {
      await checkAndCloseBlocker(updatedActionItem.blockerId);
    }

    res.status(200).json(updatedActionItem);
  } catch (err) {
    console.error('Error updating action item:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteActionItem = async (req, res) => {
  try {
    const actionItemId = req.params.id;

    const deletedActionItem = await ActionItem.findByIdAndDelete(actionItemId);
    if (!deletedActionItem) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    // If we delete an action item that wasn't completed, the blocker remains open.
    // But if we delete an open item, we haven't necessarily triggered any new closure logic.
    // If we delete a completed item, that doesn't directly affect the blocker unless it was
    // the last incomplete item (but it was already completed, so presumably the blocker status
    // would already have been updated).
    // 
    // In general, you might not need special logic here, but do so if your business logic demands it.

    res.status(200).json({ message: 'Action item deleted successfully' });
  } catch (err) {
    console.error('Error deleting action item:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Existing getActionItems (fetches all with optional query filters)
exports.getActionItems = async (req, res) => {
  try {
    const queryObj = { ...req.query };
    const actionItems = await ActionItem.find(queryObj).exec();
    res.status(200).json(actionItems);
  } catch (err) {
    console.error('Error fetching action items:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// -----------------------
// GET all ActionItems for a specific blocker
// -----------------------
exports.getActionItemsByBlockerId = async (req, res) => {
  try {
    const { blockerId } = req.params;

    const actionItems = await ActionItem.find({ blockerId }).exec();

    if (!actionItems) {
      return res.status(404).json({ error: 'No action items found for this blocker' });
    }

    res.status(200).json(actionItems);
  } catch (err) {
    console.error('Error fetching action items by blockerId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Existing getActionItemById (fetches a single ActionItem by ID)
exports.getActionItemById = async (req, res) => {
  try {
    const itemId = req.params.id;
    const actionItem = await ActionItem.findById(itemId).exec();

    if (!actionItem) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    res.status(200).json(actionItem);
  } catch (err) {
    console.error('Error fetching action item by ID:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
