const express = require("express");
const router = express.Router();
const partGraphController = require("../controllers/partGraphController");
const { authenticateToken, requireScope } = require('../services/authToken');
const trackApiUsage = require('../services/apiUsageTracker');



router.get("/", authenticateToken, requireScope('read:graphs'), trackApiUsage, partGraphController.getPartGraph);

module.exports = router;
