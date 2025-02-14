
// const User = require('../models/User');

// const getUsers = async (req, res) => {
//   try {
//     const users = await User.find();
//     res.json(users);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };
// const createUser = async (req, res) => {
//   const newUser = new User(req.body);
//   try {
//     const savedUser = await newUser.save();
//     res.status(201).json(savedUser);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// };
// module.exports = {
//   getUsers,
//   createUser,
// };
const userService = require('../services/userServices');
const Company = require('../models/Company');

const registerUser = async (req, res) => {
  try {
    const user = await userService.registerUser(req.body);
    res.status(201).json({ message: 'User registered successfully', userId: user._id });
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

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  enableMFA,
  disableMFA,
  getAllCompanies
};

