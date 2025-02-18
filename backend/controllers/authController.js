const { verifyGoogleToken } = require('../services/googleAuth');
const User = require('../models/User');

const googleAuth = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ message: 'No token provided' });
    }

    try {
        const payload = await verifyGoogleToken(token);

        const { sub: googleId, email, name, picture } = payload;

        const firstName = name.split(' ')[0];
        const lastName = name.split(' ')[1] || '';

        // Check if user exists in the database
        let user = await User.findOne({ email });

        if (!user) {
            const baseUserName = email.split('@')[0];
            let userName = baseUserName.replace(/[^a-zA-Z0-9]/g, '');
            let counter = 1;

            while (await User.findOne({ userName })) {
                userName = `${baseUserName}${counter}`;
                counter++;
            }
            // Create a new user if they don't exist
            user = new User({
                googleId,
                email,
                firstName,
                lastName,
                userName,
                profilePic: picture
            });

            await user.save();
        }

        return res.status(200).json({
            message: 'User authenticated successfully',
            user,
            token
        });
    } catch (error) {
        return res.status(401).json({ message: error.message });
    }
};

module.exports = { googleAuth };
