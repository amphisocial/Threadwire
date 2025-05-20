const { verifyGoogleToken } = require('../services/googleAuth');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const googleAuth = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ message: 'No token provided' });
    }

    try {
        const payload = await verifyGoogleToken(token);
        const { sub: googleId, email, name, picture } = payload;

        const nameParts = name ? name.split(' ') : ['User'];
        const firstName = nameParts[0] || 'User';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';

        // Check if user exists in the database
        let user = await User.findOne({ email });
        let isProfileComplete = false;
        let isNewUser = false;
        
        if (user) {
            // Existing user logic
            
            // If user exists but doesn't have googleId, update it
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }

            // Check if profile is complete - need username, phone, and customerId
            isProfileComplete = Boolean(user.phone && user.userName && user.customerId);

            const jwtToken = jwt.sign(
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
            
            return res.status(200).json({
                message: 'User authenticated successfully',
                token: jwtToken,
                tokenType: 'jwt',
                userId: user._id,
                username: user.userName,
                isProfileComplete,
                isNewUser: false
            });
        } else {
            // Check if this is a registration request
            const isRegistration = req.query.registration === 'true';
            
            if (!isRegistration) {
                return res.status(403).json({ 
                    message: 'User not found. Please register first.',
                    needsRegistration: true
                });
            }
            
            // Variables to determine user role and company
            let customerId = null;
            let company = null;
            let isPowerUser = false;
            let isFromInvitation = false;
            
            // Process invitation token if provided
            const invitationToken = req.query.token;
            
            if (invitationToken) {
                try {
                    const invitationService = require('../services/invitationService');
                    const invitationData = await invitationService.validateInvitation(invitationToken);
                    
                    // Check if the email matches the invited email
                    if (invitationData.email.toLowerCase() !== email.toLowerCase()) {
                        return res.status(400).json({ 
                            message: 'The email address does not match the invitation.'
                        });
                    }
                    
                    customerId = invitationData.companyId;
                    isFromInvitation = true;
                } catch (invitationError) {
                    return res.status(400).json({ 
                        message: `Invitation error: ${invitationError.message}`
                    });
                }
            }

            if (customerId) {
                // Check if company exists
                company = await Company.findById(customerId);
                if (!company) {
                    return res.status(400).json({ message: 'Company not found' });
                }

                // Check if the company already has a power user
                if (company.powerUserId) {
                    // Check if company has reached user limit
                    if (company.currentUserCount >= company.maxUsers) {
                        return res.status(400).json({ message: 'This company has reached its user limit' });
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
                // For Google auth without companyId, we'll set it during profile completion
                // But we need to flag that profile is incomplete
                isProfileComplete = false;
            }
            
            // Create new user with minimal information
            isNewUser = true;
            const baseUserName = email.split('@')[0];
            let userName = baseUserName.replace(/[^a-zA-Z0-9]/g, '');
            let counter = 1;

            while (await User.findOne({ userName })) {
                userName = `${baseUserName}${counter}`;
                counter++;
            }

            try {
                user = new User({
                    googleId,
                    email,
                    firstName,
                    lastName,
                    userName,
                    profilePic: picture,
                    customerId, // Will be null for non-invited users until profile completion
                    role: isPowerUser ? 'power_user' : 'regular_user'
                });

                await user.save();

                // If the user is a power user and has a company, update company's powerUserId
                if (isPowerUser && company) {
                    company.powerUserId = user._id;
                    await company.save();
                }

                // If registration is from invitation, process the invitation
                if (isFromInvitation && invitationToken) {
                    try {
                        await require('../services/invitationService').processInvitation(invitationToken);
                    } catch (error) {
                        console.error('Error processing invitation:', error);
                        // Continue with registration even if processing invitation fails
                    }
                }

                // Generate JWT
                const jwtToken = jwt.sign(
                    { 
                        userId: user._id, 
                        email: user.email, 
                        username: user.userName,
                        customerId: user.customerId,
                        role: user.role
                    },
                    '8f5517c1d9c176bfc1b57d3dd7e35588201ec54c553be38fc2959466fc9a8987',
                    { expiresIn: '24h' }
                );
                
                // Check if profile is complete - for Google users
                // Profile is complete only if they have company ID
                isProfileComplete = Boolean(customerId);
                
                return res.status(201).json({
                    message: 'User registered successfully',
                    token: jwtToken,
                    tokenType: 'jwt',
                    userId: user._id,
                    username: user.userName,
                    isProfileComplete,
                    isNewUser: true
                });
            } catch (userError) {
                console.error('User creation error:', userError);
                return res.status(400).json({ message: userError.message });
            }
        }
    } catch (error) {
        console.error('Google auth error:', error);
        return res.status(401).json({ message: error.message });
    }
};

// Add a new function to handle profile completion
const completeProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const { userName, phone, customerId } = req.body;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user fields if provided
        if (userName) {
            // Check if userName is unique
            const existingUser = await User.findOne({ userName, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            user.userName = userName;
        }

        let formattedPhone = phone;
        if (phone && !phone.startsWith('+')) {
            formattedPhone = `+${phone}`;
        }

        // Check if phone is unique (if changed)
        if (formattedPhone) {
            const existingUser = await User.findOne({ phone: formattedPhone, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ error: 'Phone number already exists' });
            }
            user.phone = formattedPhone;
        }

        if (customerId) {
            user.customerId = customerId;
        }

        // Save the updated user
        await user.save();


        return res.status(200).json({
            userId: user._id,
            message: 'Profile completed successfully'
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to complete profile' });
    }
};

module.exports = {
    googleAuth,
    completeProfile
};
