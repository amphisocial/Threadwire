const SalesOrder = require('../models/SalesOrder');
const vectorService = require('../services/vectorService');

// Get sales orders
const getSalesOrders = async (req, res) => {
  try {

    const customerId = req.user.customerId;

    const salesOrders = await SalesOrder.find({ customerId }).sort({ dueDate: 1 });
    res.status(200).json(salesOrders);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching sales orders' });
  }
};

// Edit Sales Orders
const editSalesOrder = async (req, res) => {
  try {
    const { ordernumber, linenumber } = req.body; // Extract ordernumber and linenumber from request body

    const customerId = req.user.customerId;

    if (!ordernumber || !linenumber) {
      return res.status(400).json({ message: 'Order number and line number are required.' });
    }

    // Find the sales order by ordernumber and linenumber
    const salesOrder = await SalesOrder.findOne({ ordernumber, linenumber, customerId });

    if (!salesOrder) {
      return res.status(404).json({ message: 'Sales order not found.' });
    }

    // Update the blockerTag to "Yes"
    salesOrder.blockerTag = "Yes";

    // Save the updated sales order
    const updatedOrder = await salesOrder.save();

    // Update vector embedding
    try {
      await vectorService.processDocument(updatedOrder.toObject(), 'salesOrders');
    } catch (vectorError) {
      console.error('Error updating vector embedding for sales order:', vectorError);
      // Continue despite vector error
    }

    res.status(200).json({ message: 'Blocker tag updated successfully.', salesOrder });
  } catch (error) {
    console.error('Error updating blocker tag:', error);
    res.status(500).json({ message: 'Failed to update blocker tag.', error });
  }
};
// POST: /api/salesorders/import
const importSalesOrders = async (req, res) => {
  let salesOrders = req.body;
  const customerId = req.user.customerId;

  console.log("Payload being sent to API:", salesOrders);
  // Normalize single object to array
  if (!Array.isArray(salesOrders)) {
    salesOrders = [salesOrders];
  }

  if (salesOrders.length === 0) {
    return res.status(400).json({ error: "No sales orders provided for import." });
  }

  const errors = [];
  const successCount = [];

  for (const [index, order] of salesOrders.entries()) {
    try {
      // Validate required fields
      console.log("Payload being sent to API:", salesOrders);
      if (!order.salesOrder || !order.customer_name || !order.line) {
        errors.push({
          row: index + 1,
          message: "Missing required fields: salesOrder, customer, or line.",
        });
        continue;
      }

      // Create new SalesOrder
      console.error('partnumber on line:', order.partnumber, order.salesOrder);

      const newOrder = new SalesOrder({
        ordernumber: order.salesOrder,
        program: order.program || null,
        quantity: order.qty,
        location: order.location || null,
        dueDate: new Date(order.dueDate),
        status: order.status,
        linenumber: order.line,
        partnumber: order.partnumber,
        shipping_status: order.shipping_status,
        order_date: new Date(order.order_date),
        amount: order.amount,
        customer_name: order.customer_name,
        shipping_date: new Date(order.shipping_date),
        customerId: customerId,
      });

      const savedOrder = await newOrder.save();

      // Process for vector database
      try {
        await vectorService.processDocument(savedOrder.toObject(), 'salesOrders');
      } catch (vectorError) {
        console.error('Error creating vector embedding for sales order:', vectorError);
        // Continue despite vector error
      }
      successCount.push(order.salesOrder);
    } catch (error) {
      errors.push({
        row: index + 1,
        message: `Error processing row: ${error.message}`,
      });
    }
  }

  return res.status(200).json({
    message: "Import process completed.",
    successes: successCount.length,
    errors,
  });
};

module.exports = { getSalesOrders, editSalesOrder, importSalesOrders };

