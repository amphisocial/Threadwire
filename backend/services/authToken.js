// middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    // Get the authorization header
    const authHeader = req.headers['authorization'];
    // Bearer TOKEN format - split and get the token
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, '8f5517c1d9c176bfc1b57d3dd7e35588201ec54c553be38fc2959466fc9a8987');
        // Add user data to request object
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid token.' });
    }
};

module.exports = { authenticateToken };