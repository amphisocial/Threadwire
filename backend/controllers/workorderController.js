const { WorkOrder } = require('../models/Workorder');

// Generic response handler
const handleResponse = (res, err, data) => {
  if (err) return res.status(500).json({ error: err.message });
  res.status(200).json(data);
};

// WorkOrder Controller
const createWorkOrder = (req, res) => {
  const newWorkOrder = new WorkOrder(req.body);
  newWorkOrder.save((err, data) => handleResponse(res, err, data));
};

const updateWorkOrder = (req, res) => {
  const { id } = req.params;
  WorkOrder.findByIdAndUpdate(id, req.body, { new: true }, (err, data) => handleResponse(res, err, data));
};

const deleteWorkOrder = (req, res) => {
  const { id } = req.params;
  WorkOrder.findByIdAndDelete(id, (err, data) => handleResponse(res, err, data));
};

const getWorkOrders = async (req, res) => {
  try {
    // Build a dynamic filter object based on query parameters
    const filter = {};

    if (req.query.workorder) {
      filter.workorder = req.query.workorder;
    }
    if (req.query.partnumber) {
      filter.partnumber = req.query.partnumber;
    }
    if (req.query.salesorder) {
      filter.salesorder = req.query.salesorder;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Fetch work orders based on the filter, sorted by dateCreated
    const workOrders = await WorkOrder.find(filter).sort({ dateCreated: -1 });

    res.status(200).json(workOrders);
  } catch (error) {
    console.error('Error fetching work orders:', error);
    res.status(500).json({ error: 'Error fetching work orders' });
  }
};

const importWorkorders = async (req, res) => {
  const workorderData = req.body;
  console.log("payload at server:",workorderData);
  try {
    if (!workorderData.workorder || !workorderData.type || !workorderData.description || !workorderData.partnumber || !workorderData.salesorder) {
      return res.status(400).json({ error: "Missing required fields: workorder, type, description, partnumber, or salesorder." });
    }

    const now = new Date();
    const newWorkorder = new WorkOrder({
      workorder: workorderData.workorder,
      type: workorderData.type,
      description: workorderData.description,
      partnumber: workorderData.partnumber,
      estCost: parseFloat(workorderData.estCost),
      quantity: parseInt(workorderData.quantity),
      salesorder: workorderData.salesorder,
      priority: "Low", // Default priority
      status: "Open", // Default status
      dateCreated: now,
      dateModified: now,
    });

    await newWorkorder.save();
    return res.status(201).json({ message: "Workorder imported successfully." });
  } catch (error) {
    console.error("Error importing workorder:", error.message);
    return res.status(500).json({ error: "Failed to import workorder." });
  }
};


module.exports = {
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  importWorkorders,
  getWorkOrders
};

