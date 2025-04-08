// middleware/auth.js
const jwt = require('jsonwebtoken');
const { verifyGoogleToken } = require('./googleAuth');
const User = require('../models/User');
const apiTokenService = require('../services/apiTokenService');



const authenticateToken = async (req, res, next) => {

    try {
        // Get the authorization header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        // Check token type from headers or request
        const tokenType = req.headers['auth-type'] || 'jwt';

        if (tokenType === 'google') {
            try {
                const payload = await verifyGoogleToken(token);

                const user = await User.findOne({ email: payload.email });

                if (!user) {
                    return res.status(403).json({ message: 'User not found in the system.' });
                }

                req.user = {
                    id: payload.sub,
                    email: payload.email,
                    name: payload.name,
                    picture: payload.picture,
                    isGoogleUser: true,
                    customerId: user.customerId,
                    role: user.role
                };
                return next();
            } catch (error) {
                return res.status(403).json({ message: 'Invalid Google token.' });
            }
        }
        else if (tokenType === 'api') {
            // API token verification
            try {
                const apiInfo = await apiTokenService.verifyApiToken(token);

                req.customer = {
                    id: apiInfo.customerId,
                    scopes: apiInfo.scopes,
                    tokenName: apiInfo.name,
                    isApiRequest: true
                };

                return next();
            } catch (error) {
                return res.status(403).json({ message: 'Invalid API token: ' + error.message });
            }
        }
        else {
            // Regular JWT verification
            try {
                const decoded = jwt.verify(token, '8f5517c1d9c176bfc1b57d3dd7e35588201ec54c553be38fc2959466fc9a8987');
                //             if (!decoded.customerId) {
                //     const user = await User.findOne({ 
                //         _id: decoded.userId || decoded.id  // Depending on what field you use
                //     });

                //     if (!user) {
                //         return res.status(403).json({ message: 'User not found in the system.' });
                //     }

                //     // Add customerId to the request user object
                //     req.user = {
                //         ...decoded,
                //         customerId: user.customerId
                //     };
                // } else {
                //     req.user = decoded;
                // }
                //             return next();
                //         } catch (error) {
                //             return res.status(403).json({ message: 'Invalid JWT token.' });
                //         }
                //     }
                // Get MongoDB ID from the token
                const mongoId = decoded.userId || decoded._id;

                if (!decoded.customerId) {
                    const user = await User.findOne({
                        _id: mongoId
                    });

                    if (!user) {
                        return res.status(403).json({ message: 'User not found in the system.' });
                    }

                    // Use consistent field names
                    req.user = {
                        id: user._id.toString(),
                        email: decoded.email,
                        name: decoded.username,
                        isGoogleUser: false,
                        customerId: user.customerId,
                        role: user.role
                    };
                } else {
                    // Use consistent field names
                    req.user = {
                        id: mongoId.toString(),
                        email: decoded.email,
                        name: decoded.username,
                        isGoogleUser: false,
                        customerId: decoded.customerId,
                        role: decoded.role
                    };
                }
                return next();
            } catch (error) {
                return res.status(403).json({ message: 'Invalid JWT token.' });
            }
        }
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({ message: 'Authentication failed.' });
    }
};

// Middleware to verify API scope
const requireScope = (requiredScope) => {
    return (req, res, next) => {
        // Skip for user tokens
        if (req.user) return next();
        
        // Check customer token scopes
        if (!req.customer || !req.customer.scopes) {
            return res.status(403).json({ message: 'No API scopes available' });
        }
        
        if (req.customer.scopes.includes(requiredScope) || req.customer.scopes.includes('*')) {
            return next();
        }
        
        return res.status(403).json({ 
            message: `API token missing required scope: ${requiredScope}` 
        });
    };
};

module.exports = { authenticateToken, requireScope };
