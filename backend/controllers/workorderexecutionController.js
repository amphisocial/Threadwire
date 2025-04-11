
const { WorkOrderExecution } = require('../models/Workorderexecution');
const vectorService = require('../services/vectorService');

// Generic response handler
const handleResponse = (res, err, data) => {
  if (err) return res.status(500).json({ error: err.message });
  res.status(200).json(data);
};


const deleteWorkOrderExecution = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user?.customerId || req.customer?.id;
    
    // Check if the execution record belongs to the user's company
    const execution = await WorkOrderExecution.findOne({ _id: id, customerId });
    
    if (!execution) {
      return res.status(404).json({ error: 'Work order execution not found or you do not have permission' });
    }
    
    const deletedExecution = await WorkOrderExecution.findByIdAndDelete(id);
    res.status(200).json(deletedExecution);
  } catch (error) {
    console.error('Error deleting work order execution:', error);
    res.status(500).json({ error: 'Error deleting work order execution' });
  }
}; 

const getWorkOrderExecutions = async (req, res) => {
  try {
    const customerId = req.user?.customerId || req.customer?.id;

    const filter = {
      customerId: customerId 
    };

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
    const customerId = req.user?.customerId || req.customer?.id;
    const newWorkOrderExecution = new WorkOrderExecution({
      ...req.body,
      customerId: customerId // Add user's company ID
    });
    const savedWorkOrderExecution = await newWorkOrderExecution.save();

    // Process for vector database
    try {
      await vectorService.processDocument(savedWorkOrderExecution.toObject(), 'workorderexecution');
    } catch (vectorError) {
      console.error('Error creating vector embedding for work order execution:', vectorError);
      // Continue despite vector error
    }

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


    const customerId = req.user?.customerId || req.customer?.id;
    
    // Check if the execution record belongs to the user's company
    const execution = await WorkOrderExecution.findOne({ _id: id, customerId });
    
    if (!execution) {
      return res.status(404).json({ error: 'Work order execution not found or you do not have permission' });
    }

    const updatedWorkOrderExecution = await WorkOrderExecution.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true } // Return the updated document and run validators
    );

    if (!updatedWorkOrderExecution) {
      return res.status(404).json({ error: 'Work order execution not found' });
    }

    // Update vector embedding for the updated document
    try {
      await vectorService.processDocument(updatedWorkOrderExecution.toObject(), 'workorderexecution');
    } catch (vectorError) {
      console.error('Error updating vector embedding for work order execution:', vectorError);
      // Continue despite vector error
    }


    res.status(200).json(updatedWorkOrderExecution);
  } catch (error) {
    console.error('Error updating work order execution:', error);
    res.status(500).json({ error: 'Error updating work order execution' });
  }
};

const importWorkOrderExecutions = async (req, res) => {
  const executionData = req.body;
  const customerId = req.user?.customerId || req.customer?.id;
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
      customerId: customerId,
    });

    const savedExecution = await newExecution.save();
    
    // Process for vector database
    try {
      await vectorService.processDocument(savedExecution.toObject(), 'workorderexecution');
    } catch (vectorError) {
      console.error('Error creating vector embedding for imported work order execution:', vectorError);
      // Continue despite vector error
    }

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

