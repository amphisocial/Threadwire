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

        if (user) {
            // If user exists but doesn't have googleId, update it
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }

            // Check if profile is complete
            isProfileComplete = Boolean(user.phone && user.userName && user.customerId);
        } else {
            const baseUserName = email.split('@')[0];
            let userName = baseUserName.replace(/[^a-zA-Z0-9]/g, '');
            let counter = 1;

            while (await User.findOne({ userName })) {
                userName = `${baseUserName}${counter}`;
                counter++;
            }

            // Create a new user if they don't exist
            try {
                user = new User({
                    googleId,
                    email,
                    firstName,
                    lastName,
                    userName,
                    profilePic: picture
                });

                await user.save();
            } catch (userError) {
                console.error('User creation error:', userError);
                return res.status(400).json({ message: userError.message });
            }
        }



        return res.status(200).json({
            message: 'User authenticated successfully',
            user,
            token: token,
            userId: user._id,
            isProfileComplete
        });
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
