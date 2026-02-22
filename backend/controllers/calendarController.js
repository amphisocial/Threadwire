/**
 * =============================================================================
 * Calendar Controller
 * =============================================================================
 * Handles calendar-related API operations for displaying Sales Orders and
 * Work Orders in a weekly calendar view.
 * 
 * Features:
 * - Fetch orders within a date range for calendar display
 * - Check if orders are blocked (linked to open Blockers)
 * - Returns ALL blockers per order (many-to-many relationship)
 * - Includes action items for each blocker
 * - Update order status (shipping_status for Sales, status for Work Orders)
 * 
 * Endpoints handled:
 * - GET  /calendar       - Fetch orders for calendar view
 * - PUT  /calendar/status - Update order status
 * 
 * Created: January 12, 2026
 * Updated: January 22, 2026 - Modified to return ALL blockers with action items
 * =============================================================================
 */

const SalesOrder = require('../models/SalesOrder');
const { WorkOrder } = require('../models/Workorder');
const Blocker = require('../models/Blocker');
const ActionItem = require('../models/ActionItem');  // NEW: Added for fetching action items

/**
 * GET /calendar
 * -----------------------------------------------------------------------------
 * Fetches orders (Sales Orders or Work Orders) within a specified date range
 * for display in the calendar week view.
 * 
 * For each order, it fetches ALL associated open Blockers (status != 'Closed')
 * along with their action items. This supports the many-to-many relationship
 * where one order can have multiple blockers.
 * 
 * Query Parameters:
 * @param {string} type      - Order type: 'salesorders' or 'workorders'
 * @param {string} startDate - Start of date range (ISO format: YYYY-MM-DD)
 * @param {string} endDate   - End of date range (ISO format: YYYY-MM-DD)
 * 
 * Response:
 * @returns {Array} Array of order objects with additional fields:
 *   - isBlocked {boolean}     - True if order has any open blocker
 *   - blockers {Array}        - Array of ALL open blockers with their action items
 *   - blocker {Object|null}   - First blocker (for backward compatibility)
 *   - calendarDate {Date}     - The date to position the order on calendar
 * 
 * Each blocker in the blockers array includes:
 *   - _id, title, description, status, type, assignedTo
 *   - actionItems {Array} - All action items for this blocker
 * 
 * Authentication: Required (JWT token)
 * Scope Required: read:sales
 * -----------------------------------------------------------------------------
 */
const getCalendarOrders = async (req, res) => {
  try {
    // Extract customerId from authenticated user (multi-tenant isolation)
    const customerId = req.user?.customerId || req.customer?.id;
    const { type, startDate, endDate } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    // Parse and validate date formats
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    let orders = [];

    if (type === 'salesorders') {
      // Fetch Sales Orders within date range based on shipping_date
      orders = await SalesOrder.find({
        customerId,
        shipping_date: { $gte: start, $lte: end }
      }).lean();

      // Check each order for ALL associated open blockers (many-to-many relationship)
      for (let order of orders) {
        // Find ALL open blockers for this sales order
        const openBlockers = await Blocker.find({
          relatedSalesOrders: order._id,
          status: { $ne: 'Closed' },
          customerId
        }).populate('assignedTo', 'name email').lean();

        // For each blocker, fetch its action items
        for (let blocker of openBlockers) {
          const actionItems = await ActionItem.find({
            blockerId: blocker._id,
            customerId
          }).lean();
          blocker.actionItems = actionItems || [];
        }

        // Set order properties
        order.isBlocked = openBlockers.length > 0;
        order.blockers = openBlockers;                    // Array of all blockers with action items
        order.blocker = openBlockers[0] || null;          // First blocker for backward compatibility
        order.calendarDate = order.shipping_date;
      }

    } else if (type === 'workorders') {
      // Fetch Work Orders within date range based on dueDate
      orders = await WorkOrder.find({
        customerId,
        dueDate: { $gte: start, $lte: end }
      }).lean();

      // Check each order for ALL associated open blockers (many-to-many relationship)
      for (let order of orders) {
        // Find ALL open blockers for this work order
        const openBlockers = await Blocker.find({
          relatedWorkOrders: order._id,
          status: { $ne: 'Closed' },
          customerId
        }).populate('assignedTo', 'name email').lean();

        // For each blocker, fetch its action items
        for (let blocker of openBlockers) {
          const actionItems = await ActionItem.find({
            blockerId: blocker._id,
            customerId
          }).lean();
          blocker.actionItems = actionItems || [];
        }

        // Set order properties
        order.isBlocked = openBlockers.length > 0;
        order.blockers = openBlockers;                    // Array of all blockers with action items
        order.blocker = openBlockers[0] || null;          // First blocker for backward compatibility
        order.calendarDate = order.dueDate;
      }

    } else {
      return res.status(400).json({ error: 'type must be salesorders or workorders' });
    }

    res.status(200).json(orders);

  } catch (error) {
    console.error('Error fetching calendar orders:', error);
    res.status(500).json({ error: 'Error fetching calendar orders' });
  }
};

/**
 * PUT /calendar/status
 * -----------------------------------------------------------------------------
 * Updates the status of an order (Sales Order or Work Order).
 * Used for inline status editing from the calendar UI.
 * 
 * Request Body:
 * @param {string} type    - Order type: 'salesorders' or 'workorders'
 * @param {string} orderId - MongoDB ObjectId of the order to update
 * @param {string} status  - New status value
 *   - For Sales Orders: Updates 'shipping_status' field
 *   - For Work Orders: Updates 'status' field (and sets dateModified)
 * 
 * Response:
 * @returns {Object} The updated order document
 * 
 * Authentication: Required (JWT token)
 * Scope Required: write:sales
 * -----------------------------------------------------------------------------
 */
const updateOrderStatus = async (req, res) => {
  try {
    // Extract customerId from authenticated user (multi-tenant isolation)
    const customerId = req.user?.customerId || req.customer?.id;
    const { type, orderId, status } = req.body;

    // Validate required parameters
    if (!type || !orderId || !status) {
      return res.status(400).json({ error: 'type, orderId, and status are required' });
    }

    let updatedOrder;

    if (type === 'salesorders') {
      // Update Sales Order shipping_status
      updatedOrder = await SalesOrder.findOneAndUpdate(
        { _id: orderId, customerId },
        { shipping_status: status },
        { new: true }  // Return the updated document
      );

    } else if (type === 'workorders') {
      // Update Work Order status and modification timestamp
      updatedOrder = await WorkOrder.findOneAndUpdate(
        { _id: orderId, customerId },
        { status: status, dateModified: new Date() },
        { new: true }  // Return the updated document
      );

    } else {
      return res.status(400).json({ error: 'type must be salesorders or workorders' });
    }

    // Check if order was found and updated
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json(updatedOrder);

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Error updating order status' });
  }
};

module.exports = { getCalendarOrders, updateOrderStatus };
