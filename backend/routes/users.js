// const express = require('express');
// const router = express.Router();
// const userController = require('../controllers/userController');

// router.get('/', userController.getUsers);
// router.post('/', userController.createUser);

// module.exports = router;


const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// User Registration
router.post('/register', userController.registerUser);

// User Login (supports login via email or username)
router.post('/login', userController.loginUser);

// Get User by ID
router.get('/:id', userController.getUserById);

module.exports = router;