
const { WorkOrderExecution } = require('../models/Workorderexecution');

// Generic response handler
const handleResponse = (res, err, data) => {
  if (err) return res.status(500).json({ error: err.message });
  res.status(200).json(data);
};


const deleteWorkOrderExecution = (req, res) => {
  const { id } = req.params;
  WorkOrderExecution.findByIdAndDelete(id, (err, data) => handleResponse(res, err, data));
};

const getWorkOrderExecutions = async (req, res) => {
  try {
    // Build a dynamic filter object based on query parameters
    const filter = {};

    if (req.query.workorder) {
      filter.workorder = req.query.workorder;
    }
    if (req.query.serialnumber) {
      filter.serialNumber = req.query.serialnumber;
    }
    if (req.query.partnumber) {
      filter.partnumber = req.query.partnumber;
    }
    if (req.query.operation) {
      filter.operation = req.query.operation;
    }
    if (req.query.operator) {
      filter.operator = req.query.operator;
    }

    // Fetch work order executions based on the filter, sorted by timeIn
    const workOrderExecutions = await WorkOrderExecution.find(filter).sort({ serialNumber:1,timeIn: 1 });


    res.status(200).json(workOrderExecutions);
  } catch (error) {
    console.error('Error fetching work order executions:', error);
    res.status(500).json({ error: 'Error fetching work order executions' });
  }
};

// Create a New WorkOrderExecution
const createWorkOrderExecution = async (req, res) => {
  try {
    const newWorkOrderExecution = new WorkOrderExecution(req.body);
    const savedWorkOrderExecution = await newWorkOrderExecution.save();
    res.status(201).json(savedWorkOrderExecution);
  } catch (error) {
    console.error('Error creating work order execution:', error);
    res.status(500).json({ error: 'Error creating work order execution' });
  }
};

// Update an Existing WorkOrderExecution by ID
const updateWorkOrderExecution = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedWorkOrderExecution = await WorkOrderExecution.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true } // Return the updated document and run validators
    );

    if (!updatedWorkOrderExecution) {
      return res.status(404).json({ error: 'Work order execution not found' });
    }

    res.status(200).json(updatedWorkOrderExecution);
  } catch (error) {
    console.error('Error updating work order execution:', error);
    res.status(500).json({ error: 'Error updating work order execution' });
  }
};

const importWorkOrderExecutions = async (req, res) => {
  const executionData = req.body;
  console.log("payload in server:",executionData);

  try {
    if (!executionData.workorder || !executionData.serialNumber || !executionData.partnumber || !executionData.operation || !executionData.timeIn || !executionData.status || !executionData.operator || !executionData.location) {
      return res.status(400).json({ error: "Missing required fields: workorder, serialNumber, partnumber, operation, timeIn, status, operator, or location." });
    }

    const newExecution = new WorkOrderExecution({
      workorder: executionData.workorder,
      serialNumber: executionData.serialNumber,
      partnumber: executionData.partnumber,
      operation: executionData.operation,
      timeIn: new Date(executionData.timeIn),
      timeOut: executionData.timeOut ? new Date(executionData.timeOut) : null, // TimeOut may be null
      status: executionData.status,
      operator: executionData.operator,
      location: executionData.location,
    });

    await newExecution.save();
    return res.status(201).json({ message: "Work order execution imported successfully." });
  } catch (error) {
    console.error("Error importing Work Order Execution:", error.message);
    return res.status(500).json({ error: "Failed to import Work Order Execution." });
  }
};

module.exports = {
  createWorkOrderExecution,
  updateWorkOrderExecution,
  deleteWorkOrderExecution,
  importWorkOrderExecutions,
  getWorkOrderExecutions
};

