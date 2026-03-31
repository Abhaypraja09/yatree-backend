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
            
            if (!req.user) {
                return res.status(401).json({ message: 'User no longer exists. Please log in again.' });
            }

            if (req.user.status === 'blocked') {
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

const checkCompany = (req, res, next) => {
    // 🛡️ CRASH PROTECT: Handle undefined user or company safely
    const userCompanyRaw = req.user?.company?._id || req.user?.company;
    const userCompanyId = userCompanyRaw ? userCompanyRaw.toString() : null;

    // 🛡️ TARGET RESOLUTION: Try params, body, and query for companyId
    const targetRaw = req.params?.companyId || req.body?.companyId || req.query?.companyId || req.body?.company || req.query?.company;
    const targetCompanyId = targetRaw ? targetRaw.toString() : null;

    if (!targetCompanyId || !userCompanyId) return next();

    // 👑 ADMIN BYPASS: Platform administrators and superadmins are allowed to cross boundaries.
    if (req.user && (req.user.role === 'SuperAdmin' || req.user.role === 'Admin')) {
        return next();
    }

    if (userCompanyId !== targetCompanyId) {
        return res.status(403).json({ 
            message: `Tenant Mismatch Error. (Organization boundary violation detected)` 
        });
    }
    next();
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

module.exports = { protect, admin, driver, adminOrExecutive, checkCompany };
