const User = require('../models/User');
const Company = require('../models/Company');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const registerUser = async ({ firstName, lastName, userName, email, phone, password, confirmPassword, customerId, invitationToken }) => {
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

        let company;
        let isPowerUser = false;
        let isFromInvitation = false;

        // If there's an invitation token, validate it
        if (invitationToken) {
            const invitationService = require('./invitationService');
            try {
                // Validate invitation
                const invitationData = await invitationService.validateInvitation(invitationToken);
                
                // Check if the email in the form matches the invited email
                if (invitationData.email.toLowerCase() !== email.toLowerCase()) {
                    throw new Error('The email address does not match the invitation');
                }
                
                customerId = invitationData.companyId;
                isFromInvitation = true;
            } catch (error) {
                throw new Error(`Invitation error: ${error.message}`);
            }
        }

        if (customerId) {
            // Check if company exists
            company = await Company.findById(customerId);
            if (!company) {
                throw new Error('Company not found');
            }

            // Check if the company already has a power user
            if (company.powerUserId) {
                // Check if company has reached user limit
                if (company.currentUserCount >= company.maxUsers) {
                    throw new Error('This company has reached its user limit');
                }
                
                // Regular user joining existing company - update company user count
                company.currentUserCount += 1;
                await company.save();
            } else {
                // First user for this company - make them a power user
                isPowerUser = true;
                
                // Set company license details
                company.licenseType = 'FREE';
                company.maxUsers = 3; // 1 power user + 2 regular users
                company.currentUserCount = 1;
            }
        } else {
            throw new Error('Company ID is required');
        }

        // Create new user
        const user = new User({
            firstName,
            lastName,
            userName,
            email,
            phone,
            password: hashedPassword,
            customerId,
            role: isPowerUser ? 'power_user' : 'regular_user'
        });

        // Save user to database
        await user.save();

        if (isPowerUser) {
            company.powerUserId = user._id;
            await company.save();
        }

         // If registration is from invitation, process the invitation
         if (isFromInvitation && invitationToken) {
            try {
                await require('./invitationService').processInvitation(invitationToken);
            } catch (error) {
                console.error('Error processing invitation:', error);
                // Continue with registration even if processing invitation fails
            }
        }

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
        { userId: user._id, email: user.email, username: user.userName, customerId: user.customerId, role: user.role },
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

        if (customerId) {
            // Find the company
            const company = await Company.findById(customerId);
            if (!company) {
                throw new Error('Company not found');
            }

            let isPowerUser = false;

            // Check if the company already has a power user
            if (company.powerUserId) {
                // Check if company has reached user limit
                if (company.currentUserCount >= company.maxUsers) {
                    throw new Error('This company has reached its user limit');
                }
                
                // Regular user joining existing company - update company user count
                company.currentUserCount += 1;
                await company.save();
            } else {
                // First user for this company - make them a power user
                isPowerUser = true;
                
                // Set company license details
                company.licenseType = 'FREE';
                company.maxUsers = 3; // 1 power user + 2 regular users
                company.currentUserCount = 1;
            }

            // Update user fields
            user.customerId = customerId;
            user.role = isPowerUser ? 'power_user' : 'regular_user';

            // Save the user
            await user.save();

            // If this user is a power user, update the company
            if (isPowerUser) {
                company.powerUserId = user._id;
                await company.save();
            }
        } else {
            throw new Error('Company ID is required');
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                username: user.userName,
                customerId: user.customerId,
                role: user.role
            },
            '8f5517c1d9c176bfc1b57d3dd7e35588201ec54c553be38fc2959466fc9a8987',
            { expiresIn: '1h' }
        );

        return {
            token,
            userId: user._id,
            role: user.role,
            message: 'Profile completed successfully'
        };
    } catch (error) {
        console.error('Profile completion error:', error);
        throw new Error(error.message || 'Failed to complete profile');
    }
};

const checkCompanyStatus = async (companyId) => {
    try {
        const company = await Company.findById(companyId);
        if (!company) {
            throw new Error('Company not found');
        }
        
        return {
            id: company._id,
            name: company.name,
            hasPowerUser: !!company.powerUserId,
            currentUserCount: company.currentUserCount,
            maxUsers: company.maxUsers,
            canJoin: !company.powerUserId || (company.currentUserCount < company.maxUsers)
        };
    } catch (error) {
        throw new Error(error.message || 'Failed to check company status');
    }
};

const getCompanyUsers = async (userId) => {
    try {
        // Get user details
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Get company details
        const company = await Company.findById(user.customerId);
        if (!company) {
            throw new Error('Company not found');
        }

        // Check if user is power user
        if (user.role !== 'power_user') {
            throw new Error('Access denied. Only power users can view company users.');
        }

        // Get all users from the company
        const companyUsers = await User.find({ customerId: company._id })
            .select('-password')
            .sort({ createdAt: -1 });

        return {
            users: companyUsers,
            company: {
                name: company.name,
                maxUsers: company.maxUsers,
                currentUserCount: company.currentUserCount,
                licenseType: company.licenseType
            }
        };
    } catch (error) {
        throw new Error(error.message || 'Failed to retrieve company users');
    }
};

const deleteUser = async (userId, requestingUserId) => {
    try {
        // Get the requesting user (must be power user)
        const requestingUser = await User.findById(requestingUserId);
        if (!requestingUser || requestingUser.role !== 'power_user') {
            throw new Error('Access denied. Only power users can delete users.');
        }

        // Get the user to be deleted
        const userToDelete = await User.findById(userId);
        if (!userToDelete) {
            throw new Error('User not found');
        }

        // Check if both users are from the same company
        if (userToDelete.customerId.toString() !== requestingUser.customerId.toString()) {
            throw new Error('Access denied. You can only delete users from your own company.');
        }

        // Prevent power user from deleting themselves
        if (userId === requestingUserId) {
            throw new Error('You cannot delete yourself');
        }

        // Prevent deleting another power user
        if (userToDelete.role === 'power_user') {
            throw new Error('Cannot delete another power user');
        }

        // Delete the user
        await User.findByIdAndDelete(userId);

        // Update company user count
        const company = await Company.findById(requestingUser.customerId);
        if (company && company.currentUserCount > 0) {
            company.currentUserCount -= 1;
            await company.save();
        }

        return { 
            message: `User ${userToDelete.firstName} ${userToDelete.lastName} deleted successfully`,
            deletedUser: {
                id: userToDelete._id,
                name: `${userToDelete.firstName} ${userToDelete.lastName}`,
                email: userToDelete.email
            }
        };
    } catch (error) {
        throw new Error(error.message || 'Failed to delete user');
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserById,
    enableMFA,
    disableMFA,
    verifyMFA,
    completeProfile,
    checkCompanyStatus,
    getCompanyUsers,
    deleteUser
};
