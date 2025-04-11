// services/apiTokenService.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const ApiToken = require('../models/ApiToken');
const Company = require('../models/Company');

const JWT_SECRET = '8f5517c1d9c176bfc1b57d3dd7e35588201ec54c553be38fc2959466fc9a8987'; 

// Generate a token hash for storage (never store actual tokens)
const generateTokenHash = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const expandScopes = (selectedScopes) => {
  const expandedScopes = [];
  
  if (selectedScopes.includes('read:data')) {
      expandedScopes.push(
          'read:parts', 
          'read:workorders', 
          'read:executions',
          'read:sales',
          'read:blockers',
          'read:actions',
          'read:graphs',
          'read:bops',
          'read:chatbot'
      );
  }
  
  if (selectedScopes.includes('write:data')) {
      expandedScopes.push(
          'write:parts', 
          'write:workorders', 
          'write:executions',
          'write:sales',
          'write:blockers',
          'write:actions',
          'write:bops',
          'use:chatbot'
      );
  }
  
  if (selectedScopes.includes('delete:data')) {
      expandedScopes.push(
          'delete:parts', 
          'delete:workorders', 
          'delete:executions',
          'delete:sales',
          'delete:blockers',
          'delete:actions',
          'delete:bops'
      );
  }
  
  if (selectedScopes.includes('admin')) {
      expandedScopes.push('*'); 
  }
  
  return expandedScopes;
};

// Create a new API token
const createApiToken = async ({ name, customerId, scopes, createdBy }) => {
  try {
    // Verify company exists
    const company = await Company.findById(customerId);
    if (!company) {
      throw new Error('Company not found');
    }

    const expandedScopes = expandScopes(scopes);

    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Generate JWT token
    const token = jwt.sign(
      {
        customerId,
        type: 'api_token',
        name,
        scopes
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Store token metadata (not the token itself)
    const tokenHash = generateTokenHash(token);
    
    const apiToken = new ApiToken({
      name,
      tokenIdentifier: tokenHash,
      customerId,
      scopes: expandedScopes,
      createdBy,
      expiresAt
    });

    await apiToken.save();

    return {
      token,
      id: apiToken._id,
      name: apiToken.name,
      customerId: apiToken.customerId,
      scopes: expandedScopes,
      expiresAt: apiToken.expiresAt
    };
  } catch (error) {
    throw new Error(`Failed to create API token: ${error.message}`);
  }
};

// Get all tokens for a company
const getApiTokensByCompany = async (customerId) => {
  try {
    const tokens = await ApiToken.find({ 
      customerId, 
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    })
    .select('-tokenIdentifier')
    .populate('createdBy', 'firstName lastName userName');

    return tokens;
  } catch (error) {
    throw new Error(`Failed to fetch API tokens: ${error.message}`);
  }
};

// Revoke a token
const revokeApiToken = async (tokenId, userId) => {
  try {
    const token = await ApiToken.findById(tokenId);
    
    if (!token) {
      throw new Error('Token not found');
    }
    
    token.isRevoked = true;
    await token.save();
    
    return { message: 'Token revoked successfully' };
  } catch (error) {
    throw new Error(`Failed to revoke token: ${error.message}`);
  }
};

// Verify a token (used by middleware)
const verifyApiToken = async (token) => {
  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Ensure it's an API token
    if (decoded.type !== 'api_token') {
      throw new Error('Invalid token type');
    }
    
    // Verify token is still valid in database
    const tokenHash = generateTokenHash(token);
    const storedToken = await ApiToken.findOne({
      tokenIdentifier: tokenHash,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (!storedToken) {
      throw new Error('Token has been revoked or expired');
    }
    
    // Update last used
    storedToken.lastUsed = new Date();
    await storedToken.save();
    
    return {
      customerId: decoded.customerId,
      scopes: decoded.scopes,
      name: decoded.name
    };
  } catch (error) {
    throw new Error(`API token verification failed: ${error.message}`);
  }
};

module.exports = {
  createApiToken,
  getApiTokensByCompany,
  revokeApiToken,
  verifyApiToken,
  expandScopes
};
