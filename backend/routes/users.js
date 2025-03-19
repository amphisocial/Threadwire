const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../services/authToken')

// User Registration
router.post('/register', userController.registerUser);

// User Login (supports login via email or username)
router.post('/login', userController.loginUser);

router.get('/companies', userController.getAllCompanies);

router.get('/verify-token', authenticateToken, (req, res) => {
    try {
        res.status(200).json({
          valid: true,
          user: {
            userId: req.user.userId,
            username: req.user.username
          }
        });
      } catch (error) {
        res.status(403).json({ message: 'Invalid token' });
      }
    });

// Get User by ID
router.get('/:id', userController.getUserById);

router.post('/enable-mfa/:userId', userController.enableMFA);

// Disable MFA for a user
router.post('/disable-mfa/:userId', userController.disableMFA);

router.post('/complete-profile/:userId', authenticateToken, userController.completeProfile);

module.exports = router;
