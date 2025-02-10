// routes/partRoutes.js
const express = require("express");
const router = express.Router();
const partController = require("../controllers/partsController");

// CRUD routes for parts
router.get("/", partController.getParts);
router.post("/", partController.createPart);
router.post("/import", partController.importParts);
router.put("/", partController.updatePart); // Query parameters: partnumber, revision
router.delete("/", partController.deletePart); // Query parameters: partnumber, revision

module.exports = router;

