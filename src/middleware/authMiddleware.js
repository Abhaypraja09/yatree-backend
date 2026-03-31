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
                return res.status(401).json({ message: 'User is blocked. Please contact admin.' });
            }

            // 🛡️ GLOBAL TENANT ISOLATION LAYER
            // Automatically determine the company scope for this request.
            // If the user has an assigned company, all queries should be filtered by it.
            const userCompanyId = req.user.company?._id || req.user.company;
            if (userCompanyId) {
                // Attach as a ready-to-use filter for MongoDB find/update/delete operations
                req.tenantFilter = { company: userCompanyId };
            } else if (req.user.role !== 'SuperAdmin') {
                // If not SuperAdmin and no company assigned, user is in limbo or unauthorized.
                return res.status(403).json({ message: 'Tenant context missing. Unable to verify organization boundary.' });
            }

            return next();
        } catch (error) {
            console.error('AUTH ERROR:', error.message);
            let errorMessage = 'Not authorized, token failed';
            if (error.name === 'TokenExpiredError') errorMessage = 'Session expired. Please log in again.';
            return res.status(401).json({ message: errorMessage });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const checkCompany = (req, res, next) => {
    const targetRaw = req.params?.companyId || req.body?.companyId || req.query?.companyId || req.body?.company || req.query?.company;
    const targetCompanyId = targetRaw ? targetRaw.toString() : null;

    // 👑 SUPERADMIN BYPASS + SCOPING
    if (req.user && req.user.role === 'SuperAdmin') {
        if (targetCompanyId) {
            // Inject target company into tenant filter for SuperAdmin to match the requested context
            req.tenantFilter = { company: targetCompanyId };
        }
        return next();
    }

    // 🛡️ ENFORCE TENANT BOUNDARY
    const userCompanyRaw = req.user?.company?._id || req.user?.company;
    const userCompanyId = userCompanyRaw ? userCompanyRaw.toString() : null;

    if (targetCompanyId && userCompanyId && userCompanyId !== targetCompanyId) {
        // Return 404 instead of 403 to prevent ID scanning/enumeration
        return res.status(404).json({ message: 'Resource not found in your organization.' });
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
