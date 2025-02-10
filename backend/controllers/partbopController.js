
const { PartBoP } = require('../models/Workorder');

// Generic response handler
const handleResponse = (res, err, data) => {
  if (err) return res.status(500).json({ error: err.message });
  res.status(200).json(data);
};

// PartBoP Controller
const createPartBoP = (req, res) => {
  const newPartBoP = new PartBoP(req.body);
  newPartBoP.save((err, data) => handleResponse(res, err, data));
};

const updatePartBoP = (req, res) => {
  const { id } = req.params;
  PartBoP.findByIdAndUpdate(id, req.body, { new: true }, (err, data) => handleResponse(res, err, data));
};

const deletePartBoP = (req, res) => {
  const { id } = req.params;
  PartBoP.findByIdAndDelete(id, (err, data) => handleResponse(res, err, data));
};

const getPartBoPs = async (req, res) => {
  const filters = req.query;
  try {
    // Build a dynamic filter object based on query parameters
    const filter = {};

    if (req.query.partnumber) {
      filter.partnumber = req.query.partnumber;
    }
    if (req.query.opcode) {
      filter.opcode = req.query.opcode;
    }
    if (req.query.operation) {
      filter.operation = req.query.operation;
    }

    // Fetch blockers based on the filter, sorted by status
    const PartBoPs = await PartBoP.find(filter).sort({ partnumber:1,opcode: 1 });

    res.status(200).json(PartBoPs);
  } catch (error) {
    console.error("Error fetching partbops:", error);
  }
};

const importPartBoPs = async (req, res) => {
  const partBoPData = req.body;
  console.log("Payload at server:",partBoPData);

  try {
    if (!partBoPData.partnumber || !partBoPData.operation || !partBoPData.opcode || !partBoPData.sequence || !partBoPData.planner) {
      return res.status(400).json({ error: "Missing required fields: partnumber, operation, opcode, sequence, or planner." });
    }

    const newPartBoP = new PartBoP({
      partnumber: partBoPData.partnumber,
      operation: partBoPData.operation,
      opcode: partBoPData.opcode,
      sequence: parseInt(partBoPData.sequence),
      planner: partBoPData.planner,
    });

    await newPartBoP.save();
    return res.status(201).json({ message: "Part BoP imported successfully." });
  } catch (error) {
    console.error("Error importing Part BoP:", error.message);
    return res.status(500).json({ error: "Failed to import Part BoP." });
  }
};

module.exports = {
  createPartBoP,
  updatePartBoP,
  deletePartBoP,
  importPartBoPs,
  getPartBoPs
};

