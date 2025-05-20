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
            // If user exists but doesn't have googleId, update it
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }

            // Check if profile is complete
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
            // Check if this request is specifically for registration
            const isRegistration = req.query.registration === 'true';
            const invitationToken = req.query.token;
            
            if (!isRegistration) {
                // Not a registration flow - return error for non-existent user
                return res.status(403).json({ 
                    message: 'User not found in the system. Please register first.',
                    needsRegistration: true
                });
            }
            
            // Determine user role and company based on invitation
            let companyId = null;
            let userRole = 'power_user'; // Default to power_user for self-registrations

            if (invitationToken) {
                try {
                    // Use your invitation service to validate the token
                    const invitationService = require('../services/invitationService');
                    const invitationData = await invitationService.validateInvitation(invitationToken);
                    
                    // Check if the email matches the invited email
                    if (invitationData.email.toLowerCase() !== email.toLowerCase()) {
                        return res.status(400).json({ 
                            message: 'The email address does not match the invitation.'
                        });
                    }
                    
                    companyId = invitationData.companyId;
                    userRole = 'regular_user'; // Set role to regular_user for invited users
                    
                    // Process the invitation (mark as accepted)
                    await invitationService.processInvitation(invitationToken);
                } catch (invitationError) {
                    return res.status(400).json({ 
                        message: `Invitation error: ${invitationError.message}`
                    });
                }
            }
            
            // This is a registration request, so create a new user
            isNewUser = true;
            const baseUserName = email.split('@')[0];
            let userName = baseUserName.replace(/[^a-zA-Z0-9]/g, '');
            let counter = 1;

            while (await User.findOne({ userName })) {
                userName = `${baseUserName}${counter}`;
                counter++;
            }

            // Create the new user
            try {
                user = new User({
                    googleId,
                    email,
                    firstName,
                    lastName,
                    userName,
                    profilePic: picture,
                    customerId: companyId, // Will be null for non-invited users
                    role: userRole // 'power_user' for self-registration, 'regular_user' for invited users
                });

                await user.save();

                // If the user is a power user and has a company, update company's powerUserId
                if (userRole === 'power_user' && companyId) {
                    const company = await Company.findById(companyId);
                    if (company && !company.powerUserId) {
                        company.powerUserId = user._id;
                        company.currentUserCount = 1;
                        await company.save();
                    }
                }

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
                
                return res.status(201).json({
                    message: 'User registered successfully',
                    token: jwtToken,
                    tokenType: 'jwt',
                    userId: user._id,
                    username: user.userName,
                    isProfileComplete: Boolean(companyId), // If they have a companyId, profile might be considered complete
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
