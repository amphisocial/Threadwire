const User = require('../models/User');

const requirePowerUser = async (req, res, next) => {
    try {
        // If this is an API token request, deny access
        // API tokens should not have power user privileges for security reasons
        if (req.customer && req.customer.isApiRequest) {
            return res.status(403).json({ 
                error: 'API tokens cannot access power user features. Please use a user account.' 
            });
        }

        // If role is already in the request object, use it
        if (req.user && req.user.role === 'power_user') {
            return next();
        }
        
        // Otherwise, look up the user in the database
        const userId = req.user?.id || req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ 
                error: 'Authentication required' 
            });
        }
        
        const user = await User.findById(userId);
        
        if (!user || user.role !== 'power_user') {
            return res.status(403).json({ 
                error: 'Access denied. This action requires admin privileges.' 
            });
        }
        
        // Cache the role in the request object for future middleware
        req.user.role = 'power_user';
        
        next();
    } catch (error) {
        console.error('Power user verification error:', error);
        return res.status(500).json({ error: 'Server error while checking admin privileges' });
    }
};

module.exports = { requirePowerUser };