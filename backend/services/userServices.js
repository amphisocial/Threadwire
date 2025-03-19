const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

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

const loginUser = async ({ email, password, otp }) => {
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

    if (user.mfaEnabled) {
        console.log("MFA is enabled, checking OTP...");
        if (!otp) {
            console.log("OTP not provided");
            throw new Error('OTP is required');
        }

        console.log("OTP provided:", otp);
        await verifyMFA(user._id, otp);
    }


    // Generate JWT token
    const token = jwt.sign(
        { userId: user._id, email: user.email, username: user.userName },
        '8f5517c1d9c176bfc1b57d3dd7e35588201ec54c553be38fc2959466fc9a8987',
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

const enableMFA = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Generate a new MFA secret
    const secret = speakeasy.generateSecret({ length: 20 });

    // Store the secret in the database
    user.mfaSecret = secret.base32;
    user.mfaEnabled = true;

    await user.save();

    // Generate a QR code for the user to scan
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    return { qrCodeUrl };
};

const disableMFA = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    user.mfaEnabled = false;
    user.mfaSecret = null;
    await user.save();

    return { message: 'MFA disabled successfully' };
};


const verifyMFA = async (userId, token) => {
    const user = await User.findById(userId);
    if (!user || !user.mfaEnabled) {
        throw new Error('MFA not enabled for this user');
    }

    // Verify the OTP using speakeasy
    const isValid = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token,
    });

    if (!isValid) {
        throw new Error('Invalid MFA Token');
    }

    return { message: 'MFA verified successfully' };
};

const completeProfile = async (userId, profileData) => {
    try {
        const { userName, phone, customerId } = profileData;

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Check if userName is unique (if provided)
        if (userName) {
            const existingUser = await User.findOne({ userName, _id: { $ne: userId } });
            if (existingUser) {
                throw new Error('Username already exists');
            }
            user.userName = userName;
        }

        // Check if phone is unique (if provided)
        if (phone) {
            const existingUser = await User.findOne({ phone, _id: { $ne: userId } });
            if (existingUser) {
                throw new Error('Phone number already exists');
            }
            user.phone = phone;
        }

        // Update customerId if provided
        if (customerId) {
            user.customerId = customerId;
        }

        // Save the updated user
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, username: user.userName },
            '8f5517c1d9c176bfc1b57d3dd7e35588201ec54c553be38fc2959466fc9a8987',
            { expiresIn: '1h' }
        );

        return {
            token,
            userId: user._id,
            message: 'Profile completed successfully'
        };
    } catch (error) {
        throw new Error(error.message || 'Failed to complete profile');
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserById,
    enableMFA,
    disableMFA,
    verifyMFA,
    completeProfile
};
