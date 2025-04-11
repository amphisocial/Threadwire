// controllers/partController.js
const Part = require("../models/Part");
const vectorService = require('../services/vectorService');

// GET Parts with optional filters
exports.getParts = async (req, res) => {
  try {
    const filters = {};
    const { partnumber, description, revision, category, type, isbom } = req.query;
    
    
    filters.customerId = req.user?.customerId || req.customer?.id;

    if (req.query.partnumber) filters.partnumber = new RegExp(req.query.partnumber, "i");
    if (description) filters.description = new RegExp(description, "i");
    if (revision) filters.revision = revision;
    if (category) filters.category = category;
    if (type) filters.type = type;
    if (isbom) filters.isbom = isbom === "true";

    const parts = await Part.find(filters).sort({ partnumber: 1, revision: 1 });
    res.status(200).json(parts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching parts", error });
  }
};

// POST Create new Part
exports.createPart = async (req, res) => {
  try {
    const part = new Part({
      ...req.body,
      customerId: req.user.customerId
    });
    const savedPart = await part.save();
    
    // Process for vector database
    try {
      await vectorService.processDocument(savedPart.toObject(), 'parts');
    } catch (vectorError) {
      console.error('Error creating vector embedding for part:', vectorError);
      // Continue despite vector error
    }
    res.status(201).json(part);
  } catch (error) {
    res.status(400).json({ message: "Error creating part", error });
  }
};

// PUT Update Part by partnumber & revision
exports.updatePart = async (req, res) => {
  try {
    const { partnumber, revision } = req.query;
    const updatedPart = await Part.findOneAndUpdate(
      { partnumber, revision, customerId },
      { ...req.body, datemodified: new Date() },
      { new: true }
    );

    if (!updatedPart) {
      return res.status(404).json({ message: "Part not found" });
    }

    // Update vector embedding
    try {
      await vectorService.processDocument(updatedPart.toObject(), 'parts');
    } catch (vectorError) {
      console.error('Error updating vector embedding for part:', vectorError);
      // Continue despite vector error
    }

    res.status(200).json(updatedPart);
  } catch (error) {
    res.status(400).json({ message: "Error updating part", error });
  }
};

// DELETE Part by partnumber & revision
exports.deletePart = async (req, res) => {
  try {
    const { partnumber, revision } = req.query;
    const customerId = req.user.customerId;
    const deletedPart = await Part.findOneAndDelete({ partnumber, revision, customerId });

    if (!deletedPart) {
      return res.status(404).json({ message: "Part not found" });
    }
    res.status(200).json({ message: "Part deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting part", error });
  }
};

// Bulk import parts from CSV
exports.importParts = async (req, res) => {
  const partData = req.body;
  const customerId = req.user.customerId;

  try {
    if (!partData.partnumber || !partData.revision || !partData.description) {
      return res.status(400).json({ error: "Missing required fields: partnumber, revision, or description." });
    }

    const now = new Date();
    const newPart = new Part({
      partnumber: partData.partnumber,
      revision: partData.revision,
      description: partData.description,
      type: partData.type,
      category: partData.category,
      unit_price: parseFloat(partData.unit_price),
      isbom: partData.isbom,
      datecreated: now,
      datemodified: now,
      customerId: customerId
    });

    const savedPart = await newPart.save();
    
    // Process for vector database
    try {
      await vectorService.processDocument(savedPart.toObject(), 'parts');
    } catch (vectorError) {
      console.error('Error creating vector embedding for imported part:', vectorError);
      // Continue despite vector error
    }

    return res.status(201).json({ message: "Part imported successfully." });
  } catch (error) {
    console.error("Error importing part:", error.message);
    return res.status(500).json({ error: "Failed to import part." });
  }
};
