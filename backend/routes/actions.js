const express = require('express');
const router = express.Router();

const actionItemController = require('../controllers/actionItemController');

router.post('/', actionItemController.createActionItem);
router.get('/', actionItemController.getActionItems);
router.get('/blocker/:blockerId', actionItemController.getActionItemsByBlockerId);
router.get('/:id', actionItemController.getActionItemById);
router.put('/:id', actionItemController.updateActionItem);
router.delete('/:id', actionItemController.deleteActionItem);

module.exports = router;
