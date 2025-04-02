const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../services/authToken');
const { requirePowerUser } = require('../services/powerUserAuth');

// User Registration
router.post('/register', userController.registerUser);

// User Login (supports login via email or username)
router.post('/login', userController.loginUser);

router.get('/companies', userController.getAllCompanies);

router.get('/verify-token', authenticateToken, userController.verifyToken);

// Get User by ID
router.get('/:id', userController.getUserById);

router.post('/enable-mfa/:userId', userController.enableMFA);

// Disable MFA for a user
router.post('/disable-mfa/:userId', userController.disableMFA);

router.post('/complete-profile/:userId', authenticateToken, userController.completeProfile);

router.get('/company-status/:companyId', userController.checkCompanyStatus);

router.get('/company-users', authenticateToken, requirePowerUser, userController.getCompanyUsers);

router.get('/check-power-user', authenticateToken, userController.checkPowerUser);

module.exports = router;
