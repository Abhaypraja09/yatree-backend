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
            
            // 🛡️ TRANSFER PROXY STATUS FROM JWT TO USER OBJECT
            if (decoded.isSuperAdminProxy && req.user) {
                req.user.isSuperAdminProxy = true;
            }
            
            if (!req.user) {
                return res.status(401).json({ message: 'User no longer exists. Please log in again.' });
            }

            if (req.user.status === 'blocked') {
                return res.status(401).json({ message: 'User is blocked. Please contact admin.' });
            }

            // 🛡️ SECURITY: Real-time company suspension check
            if (req.user.company && req.user.company.status?.toLowerCase() === 'suspended') {
                return res.status(403).json({ 
                    message: 'Access Denied: Your organization has been suspended. Please contact the administrator.' 
                });
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
    // 🛡️ RECOVERY: If req.user is missing (protect didn't run?), block it
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required for company check.' });
    }

    const targetRaw = req.params?.companyId || req.body?.companyId || req.query?.companyId || req.body?.company || req.query?.company;
    const targetCompanyId = targetRaw ? targetRaw.toString() : null;

    const userRole = req.user.role?.toLowerCase();
    const userCompanyRaw = req.user.company?._id || req.user.company;
    const userCompanyId = userCompanyRaw ? userCompanyRaw.toString() : null;

    // 👑 SUPERADMIN PROTECTION
    if (userRole === 'superadmin') {
        // 1. ALLOW if it's an authorized PROXY session (via Bridge)
        if (req.user.isSuperAdminProxy && targetCompanyId) {
            req.tenantFilter = { company: targetCompanyId };
            return next();
        }

        // 2. 🏠 HOME COMPANY BYPASS: If SuperAdmin is explicitly tied to a company (Master User)
        if (userCompanyId) {
            // Allow if viewing their own company, otherwise restrict to bridge
            if (targetCompanyId && userCompanyId !== targetCompanyId) {
                return res.status(403).json({ message: 'Home Company Restricted: Use Bridge for other organizations.' });
            }
            req.tenantFilter = { company: userCompanyId };
            return next();
        }

        console.warn(`🛡️ PROTECTION: SuperAdmin ${req.user._id} attempted direct access to company ${targetCompanyId || 'unknown'}. Access Denied.`);
        return res.status(403).json({ message: 'Security Policy: SuperAdmins must use the Bridge feature to view tenant data.' });
    }

    // 🛡️ ENFORCE TENANT BOUNDARY FOR ALL OTHERS
    // 1. Must have a company assigned to their profile
    if (!userCompanyId) {
        console.error(`🚨 ACCESS DENIED: User ${req.user._id} (${req.user.role}) attempted access without assigned company.`);
        return res.status(403).json({ message: 'Access Denied: Your account is not associated with any organization.' });
    }

    // 2. If a specific company is requested (via URL, body, etc), it MUST match their assigned company
    if (targetCompanyId && userCompanyId !== targetCompanyId) {
        console.warn(`🚨 SECURITY ALERT: User ${req.user._id} attempted to access company ${targetCompanyId} (Authorized: ${userCompanyId})`);
        return res.status(404).json({ message: 'Resource not found in your organization.' });
    }

    // 3. Fallback: Always ensure req.tenantFilter is set to the user's company
    req.tenantFilter = { company: userCompanyId };
    
    // Inject the ID into params if it's missing but needed by downstream controllers
    if (!req.params.companyId) {
        req.params.companyId = userCompanyId;
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
    if (role === 'admin' || role === 'executive' || role === 'superadmin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized' });
    }
};

module.exports = { protect, admin, driver, adminOrExecutive, checkCompany };
