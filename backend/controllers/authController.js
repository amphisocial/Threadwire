const { verifyGoogleToken } = require('../services/googleAuth');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Company = require('../models/Company');

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
            
            // Variables for invitation handling
            let customerId = null;
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
                    
                    // For invited users, we need to check if the company exists
                    const company = await Company.findById(customerId);
                    if (!company) {
                        return res.status(400).json({ message: 'Company not found' });
                    }
                    
                    // Check if company has reached user limit
                    if (company.powerUserId && company.currentUserCount >= company.maxUsers) {
                        return res.status(400).json({ message: 'This company has reached its user limit' });
                    }
                } catch (invitationError) {
                    return res.status(400).json({ 
                        message: `Invitation error: ${invitationError.message}`
                    });
                }
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
                // For Google sign-ups, we create the user with minimal info first
                // The role will be determined during profile completion based on the selected company
                user = new User({
                    googleId,
                    email,
                    firstName,
                    lastName,
                    userName,
                    profilePic: picture,
                    customerId, // Will be null unless from invitation
                    // Don't set role yet for users without an invitation - it will be set during profile completion
                    ...(isFromInvitation && { role: 'regular_user' })
                });

                await user.save();

                // If registration is from invitation, process the invitation
                if (isFromInvitation && invitationToken) {
                    try {
                        await require('../services/invitationService').processInvitation(invitationToken);
                        
                        // Update company user count for invited users
                        const company = await Company.findById(customerId);
                        if (company) {
                            company.currentUserCount += 1;
                            await company.save();
                        }
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
                
                // Profile is complete only if from invitation with customerId
                isProfileComplete = Boolean(isFromInvitation && customerId);
                
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

const completeProfile = async (userId, profileData) => {
    try {
        const { userName, phone, customerId, companyName } = profileData;
         
        console.log(`Profile completion for user ${userId} with company ${customerId}`);
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

        let isPowerUser = false;
        let company = null;

        // Update customerId if provided
        if (customerId) {
            console.log(`Using existing company with ID: ${customerId}`);
            
            // Find the company
            company = await Company.findById(customerId);
            if (!company) {
                throw new Error('Company not found');
            }

            console.log('Company found:', {
                id: company._id,
                name: company.name,
                powerUserId: company.powerUserId,
                currentUserCount: company.currentUserCount,
                maxUsers: company.maxUsers
            });

            // Check if this company already has a power user
            if (!company.powerUserId) {
                console.log('Company has no power user yet. Setting this user as power user.');
                isPowerUser = true;
                
                // Set company license details
                company.licenseType = 'FREE';
                company.maxUsers = 3; // 1 power user + 2 regular users
                company.currentUserCount = 1;
                company.powerUserId = user._id;
            } else {
                console.log('Company already has a power user');
                
                // Check if company has reached user limit
                if (company.currentUserCount >= company.maxUsers) {
                    throw new Error('This company has reached its user limit');
                }
                
                // Regular user joining existing company
                company.currentUserCount += 1;
            }
        } else if (companyName) {
            // Create a new company if companyName is provided but customerId isn't
            console.log(`Creating new company: ${companyName}`);
            
            // This user will be the power user of the new company
            isPowerUser = true;
            
            // Create new company
            company = new Company({
                name: companyName,
                licenseType: 'FREE',
                maxUsers: 3, // 1 power user + 2 regular users
                currentUserCount: 1
                // powerUserId will be set after user is saved
            });
            
            // Save the new company to get an ID
            await company.save();
            console.log(`New company created with ID: ${company._id}`);
            
            // Now we have a company ID to assign to the user
            company.powerUserId = user._id;
            await company.save();
        } else {
            throw new Error('Either customerId or companyName is required');
        }
        
        // Update user with company and role information
        user.customerId = company._id;
        user.role = isPowerUser ? 'power_user' : 'regular_user';
        console.log(`Setting user role to: ${user.role}`);
        
        // Save the updated user
        await user.save();
        console.log('User saved with updated profile');
        
        // Save any company changes
        await company.save();
        console.log('Company saved with updated information');

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
            message: 'Profile completed successfully'
        };
    } catch (error) {
        console.error('Profile completion error:', error);
        throw new Error(error.message || 'Failed to complete profile');
    }
};

module.exports = {
    googleAuth,
    completeProfile
};
