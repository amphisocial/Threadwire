const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../services/authToken')

const actionItemController = require('../controllers/actionItemController');

router.post('/',authenticateToken, actionItemController.createActionItem);
router.get('/',authenticateToken, actionItemController.getActionItems);
router.get('/blocker/:blockerId',authenticateToken, actionItemController.getActionItemsByBlockerId);
router.get('/:id',authenticateToken, actionItemController.getActionItemById);
router.put('/:id',authenticateToken, actionItemController.updateActionItem);
router.delete('/:id',authenticateToken, actionItemController.deleteActionItem);

module.exports = router;
