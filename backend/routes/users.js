const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const invitationController = require('../controllers/invitationController');
const { authenticateToken } = require('../services/authToken');
const { requirePowerUser } = require('../services/powerUserAuth');

// User Registration
router.post('/register', userController.registerUser);

// User Login (supports login via email or username)
router.post('/login', userController.loginUser);

router.get('/companies', userController.getAllCompanies);

router.get('/verify-token', authenticateToken, userController.verifyToken);

router.get('/company-status/:companyId', userController.checkCompanyStatus);
router.get('/company-users', authenticateToken, requirePowerUser, userController.getCompanyUsers);
router.get('/check-power-user', authenticateToken, userController.checkPowerUser);

router.post('/enable-mfa/:userId', userController.enableMFA);

// Disable MFA for a user
router.post('/disable-mfa/:userId', userController.disableMFA);

router.post('/complete-profile/:userId', authenticateToken, userController.completeProfile);

router.get('/:id', userController.getUserById);

router.delete('/:userId', authenticateToken, requirePowerUser, userController.deleteUser);

router.post('/invitations', authenticateToken, requirePowerUser, invitationController.createInvitation);
router.get('/invitations/validate', invitationController.validateInvitation);
router.post('/invitations/process', invitationController.processInvitation);
router.get('/invitations/pending', authenticateToken, requirePowerUser, invitationController.getPendingInvitations);
router.post('/invitations/:invitationId/resend', authenticateToken, requirePowerUser, invitationController.resendInvitation);

module.exports = router;
