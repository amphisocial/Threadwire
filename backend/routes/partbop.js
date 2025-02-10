
const express = require('express');
const router = express.Router();
const controllers = require('../controllers/partbopController');

// PartBoP Routes
router.post('/', controllers.createPartBoP);
router.post('/import', controllers.importPartBoPs);
router.put('/:id', controllers.updatePartBoP);
router.delete('/:id', controllers.deletePartBoP);
router.get('/', controllers.getPartBoPs);

module.exports = router;

