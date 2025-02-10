const express = require("express");
const router = express.Router();
const partGraphController = require("../controllers/partGraphController");

router.get("/", partGraphController.getPartGraph);

module.exports = router;
