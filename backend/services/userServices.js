const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const registerUser = async ({ firstName, lastName, userName, email, phone, password, confirmPassword, customerId }) => {
    try {
        // Password match validation
        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { userName }, { phone }] });
        if (existingUser) {
            throw new Error('User with given email, username, or phone already exists');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = new User({
            firstName,
            lastName,
            userName,
            email,
            phone,
            password: hashedPassword,
            customerId
        });

        // Save user to database
        await user.save();

        return { message: 'User registered successfully' };
    }
    catch (error) {
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            throw new Error(errors.join(', '));
        }

        // Throw any other errors
        throw new Error(error.message || 'Internal Server Error');
    }
};

const loginUser = async ({ email, password }) => {
    // Find user by email only
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('Invalid email or password');
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = jwt.sign(
        { userId: user._id, email: user.email, username: user.userName },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    return { token, userId: user._id, username: user.userName };
};

const getUserById = async (userId) => {
    const user = await User.findById(userId).select('-password');
    if (!user) {
        throw new Error('User not found');
    }
    return user;
};

module.exports = {
    registerUser,
    loginUser,
    getUserById
};
