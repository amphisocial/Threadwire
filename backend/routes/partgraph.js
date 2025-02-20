const express = require("express");
const router = express.Router();
const partGraphController = require("../controllers/partGraphController");
const { authenticateToken } = require('../services/authToken');


router.get("/", authenticateToken, partGraphController.getPartGraph);

module.exports = router;
