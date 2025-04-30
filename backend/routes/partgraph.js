// const express = require("express");
// const router = express.Router();
// const partGraphController = require("../controllers/partGraphController");
// const { authenticateToken, requireScope } = require('../services/authToken');
// const trackApiUsage = require('../services/apiUsageTracker');



// router.get("/", authenticateToken, requireScope('read:graphs'), trackApiUsage, partGraphController.getPartGraph);

// module.exports = router;


const express = require("express");
const router = express.Router();
const partGraphController = require("../controllers/partGraphController");
const { authenticateToken, requireScope } = require('../services/authToken');
const trackApiUsage = require('../services/apiUsageTracker');

// Get graph data for an entity and its relationships
router.get("/", authenticateToken, requireScope('read:graphs'), trackApiUsage, partGraphController.getPartGraph);

// Search for entities (for the search functionality)
router.get("/search", authenticateToken, requireScope('read:graphs'), trackApiUsage, partGraphController.searchEntities);

module.exports = router;