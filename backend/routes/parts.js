// routes/partRoutes.js
const express = require("express");
const router = express.Router();
const partController = require("../controllers/partsController");
const { authenticateToken, requireScope } = require('../services/authToken');
const trackApiUsage = require('../services/apiUsageTracker');



// CRUD routes for parts
router.get("/", authenticateToken, requireScope('read:parts'),  trackApiUsage, partController.getParts);
router.post("/", authenticateToken, requireScope('write:parts'), trackApiUsage, partController.createPart);
router.post("/import", authenticateToken, requireScope('write:parts'), trackApiUsage, partController.importParts);
router.put("/", authenticateToken, requireScope('write:parts'), trackApiUsage, partController.updatePart); // Query parameters: partnumber, revision
router.delete("/", authenticateToken,requireScope('write:parts'), trackApiUsage, partController.deletePart); // Query parameters: partnumber, revision
 
module.exports = router;

