const User = require('../models/User');

const requirePowerUser = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user.userId;
        const user = await User.findById(userId);
        
        if (!user || user.role !== 'power_user') {
            return res.status(403).json({ 
                error: 'Access denied. This action requires power user privileges.' 
            });
        }
        
        next();
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { requirePowerUser };