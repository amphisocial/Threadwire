const express = require('express');
const router = express.Router();
const apiTokenController = require('../controllers/apiTokenController');
const { authenticateToken } = require('../services/authToken');
const { requirePowerUser } = require('../services/powerUserAuth');

// Only power users can manage API tokens
router.use(authenticateToken, requirePowerUser);

// Create a new API token
router.post('/', apiTokenController.createApiToken);

// Get all API tokens for the company
router.get('/', apiTokenController.getApiTokens);

// Revoke an API token
router.delete('/:tokenId', apiTokenController.revokeApiToken);

module.exports = router;
