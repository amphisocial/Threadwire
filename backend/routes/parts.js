// routes/partRoutes.js
const express = require("express");
const router = express.Router();
const partController = require("../controllers/partsController");
const { authenticateToken } = require('../services/authToken');


// CRUD routes for parts
router.get("/", authenticateToken, partController.getParts);
router.post("/", authenticateToken, partController.createPart);
router.post("/import", authenticateToken, partController.importParts);
router.put("/", authenticateToken, partController.updatePart); // Query parameters: partnumber, revision
router.delete("/", authenticateToken, partController.deletePart); // Query parameters: partnumber, revision

module.exports = router;

