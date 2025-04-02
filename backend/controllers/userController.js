
const userService = require('../services/userServices');
const Company = require('../models/Company');

const registerUser = async (req, res) => {
  try {
    const user = await userService.registerUser(req.body);
    res.status(201).json({ message: 'User registered successfully', userId: user._id, role: result.user.role });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    // Pass OTP to the service function
    const result = await userService.loginUser({ email, password, otp });

    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json(user);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const enableMFA = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.enableMFA(userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


const disableMFA = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.disableMFA(userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find({}, 'name _id companyId');
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const completeProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userService.completeProfile(userId, req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const checkCompanyStatus = async (req, res) => {
  try {
      const { companyId } = req.params;
      const status = await userService.checkCompanyStatus(companyId);
      res.status(200).json(status);
  } catch (error) {
      res.status(400).json({ error: error.message });
  }
};

const getCompanyUsers = async (req, res) => {
  try {
      const userId = req.user.id || req.user.userId;
      const result = await userService.getCompanyUsers(userId);
      res.status(200).json(result);
  } catch (error) {
      res.status(400).json({ error: error.message });
  }
};

const verifyToken = (req, res) => {
  try {
      // Return user information including role
      res.status(200).json({
          valid: true,
          user: {
              userId: req.user.id || req.user.userId,
              username: req.user.username || req.user.name,
              email: req.user.email,
              role: req.user.role,
              customerId: req.user.customerId
          }
      });
  } catch (error) {
      res.status(403).json({ message: 'Invalid token' });
  }
};

const checkPowerUser = (req, res) => {
  try {
      const role = req.user.role || '';
      res.status(200).json({
          isPowerUser: role === 'power_user'
      });
  } catch (error) {
      res.status(403).json({ message: 'Authentication failed' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  enableMFA,
  disableMFA,
  getAllCompanies,
  completeProfile,
  checkCompanyStatus,
  getCompanyUsers,
  verifyToken,
  checkPowerUser
};

