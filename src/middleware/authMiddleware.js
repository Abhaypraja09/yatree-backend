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
            } else if (req.user.role?.toLowerCase() !== 'superadmin') {
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
    if (req.user && req.user.role?.toLowerCase() === 'superadmin') {
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

const logToFile = (msg) => {
    const fs = require('fs');
    const path = require('path');
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] AUTH_LOG: ${msg}\n`;
    try {
        fs.appendFileSync(path.join(process.cwd(), 'server_debug.log'), logMsg);
    } catch (e) {}
};

const admin = (req, res, next) => {
    const role = req.user?.role?.toLowerCase();
    logToFile(`[CHECK_ADMIN] User: ${req.user?._id}, Role: ${req.user?.role}, Result: ${role === 'admin' || role === 'superadmin'}`);
    if (role === 'admin' || role === 'superadmin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

const driver = (req, res, next) => {
    const role = req.user?.role?.toLowerCase();
    if (role === 'driver') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as a driver' });
    }
};

const adminOrExecutive = (req, res, next) => {
    const role = req.user?.role?.toLowerCase();
    logToFile(`[CHECK_ADMIN_OR_EXEC] User: ${req.user?._id}, Role: ${req.user?.role}, Result: ${role === 'admin' || role === 'executive' || role === 'superadmin'}`);
    if (role === 'admin' || role === 'executive' || role === 'superadmin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized' });
    }
};

module.exports = { protect, admin, driver, adminOrExecutive, checkCompany };
