const { WorkOrder } = require('../models/Workorder');
const vectorService = require('../services/vectorService');

// Generic response handler
const handleResponse = (res, err, data) => {
  if (err) return res.status(500).json({ error: err.message });
  res.status(200).json(data);
};

// WorkOrder Controller
const createWorkOrder = async (req, res) => {
  try {
    const newWorkOrder = new WorkOrder(req.body);
    const savedWorkOrder = await newWorkOrder.save();

    // Process for vector database
    try {
      await vectorService.processDocument(savedWorkOrder.toObject(), 'workorders');
    } catch (vectorError) {
      console.error('Error creating vector embedding for work order:', vectorError);
      // Continue despite vector error
    }

    res.status(201).json(savedWorkOrder);
  } catch (err) {
    handleResponse(res, err, null);
  }
};

const updateWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedWorkOrder = await WorkOrder.findByIdAndUpdate(id, req.body, { new: true });
    
    if (updatedWorkOrder) {
      // Update vector embedding for the updated document
      try {
        await vectorService.processDocument(updatedWorkOrder.toObject(), 'workorders');
      } catch (vectorError) {
        console.error('Error updating vector embedding for work order:', vectorError);
        // Continue despite vector error
      }
    }
    
    handleResponse(res, null, updatedWorkOrder);
  } catch (err) {
    handleResponse(res, err, null);
  }
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
  console.log("payload at server:", workorderData);
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

    const savedWorkorder = await newWorkorder.save();
    
    // Process for vector database
    try {
      await vectorService.processDocument(savedWorkorder.toObject(), 'workorders');
    } catch (vectorError) {
      console.error('Error creating vector embedding for imported work order:', vectorError);
      // Continue despite vector error
    }
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

