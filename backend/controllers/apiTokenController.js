const apiTokenService = require('../services/apiTokenService');

const createApiToken = async (req, res) => {
  try {
    const { name, scopes } = req.body;
    const customerId = req.user.customerId;
    const createdBy = req.user.id;
    
    if (!name || !scopes || !Array.isArray(scopes)) {
      return res.status(400).json({ error: 'Name and scopes are required' });
    }
    
    const result = await apiTokenService.createApiToken({
      name,
      customerId,
      scopes,
      createdBy
    });
    
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getApiTokens = async (req, res) => {
  try {
    const customerId = req.user.customerId;
    const tokens = await apiTokenService.getApiTokensByCompany(customerId);
    res.status(200).json(tokens);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const revokeApiToken = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const userId = req.user.id;
    
    const result = await apiTokenService.revokeApiToken(tokenId, userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createApiToken,
  getApiTokens,
  revokeApiToken
};
