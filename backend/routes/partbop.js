
const express = require('express');
const router = express.Router();
const controllers = require('../controllers/partbopController');
const { authenticateToken } = require('../services/authToken')


// PartBoP Routes
router.post('/', authenticateToken, controllers.createPartBoP);
router.post('/import', authenticateToken, controllers.importPartBoPs);
router.put('/:id', authenticateToken, controllers.updatePartBoP);
router.delete('/:id', authenticateToken, controllers.deletePartBoP);
router.get('/', authenticateToken, controllers.getPartBoPs);

module.exports = router;

