const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const secret = process.env.JWT_SECRET || 'yatree_secure_fallback_key_2024';
            const decoded = jwt.verify(token, secret);

            req.user = await User.findById(decoded.id).select('-password').populate('company');

            if (req.user && req.user.status === 'blocked') {
                console.log(`AUTH FAIL: User ${req.user.mobile} is blocked`);
                return res.status(401).json({ message: 'User is blocked. Please contact admin.' });
            }

            return next();
        } catch (error) {
            console.error('AUTH ERROR DETAILS:', {
                message: error.message,
                name: error.name,
                token_prefix: token ? token.substring(0, 10) : 'none'
            });

            let errorMessage = 'Not authorized, token failed';
            if (error.name === 'TokenExpiredError') {
                errorMessage = 'Session expired. Please log in again.';
            } else if (error.name === 'JsonWebTokenError') {
                errorMessage = 'Invalid session. Please log out and log in again.';
            }

            return res.status(401).json({ message: errorMessage });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

const driver = (req, res, next) => {
    if (req.user && req.user.role === 'Driver') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as a driver' });
    }
};

const adminOrExecutive = (req, res, next) => {
    if (req.user && (req.user.role === 'Admin' || req.user.role === 'Executive')) {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized' });
    }
};

module.exports = { protect, admin, driver, adminOrExecutive };
