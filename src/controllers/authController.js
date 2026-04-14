const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');

const generateToken = (id) => {
    const secret = process.env.JWT_SECRET || 'yatree_secure_fallback_key_2024';
    return jwt.sign({ id: id.toString() }, secret, {
        expiresIn: '30d',
    });
};

const fs = require('fs');
const path = require('path');

const logError = (msg) => {
    try {
        const logPath = path.join(__dirname, '../../server_debug.log');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
        console.log(msg); // Also log to console
    } catch (e) {
        console.error('Logging failed:', e);
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        logError('Login attempt started');
        const { mobile, password } = req.body;
        logError(`Login request for: ${mobile}`);

        const jwtSecret = process.env.JWT_SECRET || 'yatree_secure_fallback_key_2024';

        if (!process.env.JWT_SECRET) {
            logError('WARNING: JWT_SECRET environment variable is missing! Using fallback for now.');
        }

        // Check if DB is connected
        const mongoose = require('mongoose');
        const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];

        // If connecting, wait for up to 5 seconds
        if (mongoose.connection.readyState === 2) { // Connecting
            logError('Database is connecting... waiting for ready state.');
            for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (mongoose.connection.readyState === 1) break;
            }
        }

        if (mongoose.connection.readyState !== 1) {
            const currentState = states[mongoose.connection.readyState] || 'Unknown';
            logError(`Login aborted: Database not connected (Current State: ${currentState})`);

            // Check for DB readiness with a small wait if necessary
            if (mongoose.connection.readyState !== 1) {
                console.log('DB not ready, waiting 2 seconds...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                if (mongoose.connection.readyState !== 1) {
                    return res.status(503).json({
                        message: "Database is warming up. Please try again in 5 seconds. If this persists, check MongoDB Atlas Network Access (0.0.0.0/0)."
                    });
                }
            }
        }

        // Try to find user by mobile OR exact username (case-insensitive where possible)
        let user = await User.findOne({
            $or: [
                { mobile: mobile.trim() },
                { username: { $regex: new RegExp(`^${mobile.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } },
                { username: mobile.trim() } // Direct fallback match
            ],
            isFreelancer: { $ne: true }
        }).populate('company');

        if (!user) {
            logError(`Login failed: User [${mobile}] not found in standard lookup.`);
            // Direct fallback exact match again just in case
            user = await User.findOne({ username: mobile }).populate('company');
            if (user && user.isFreelancer !== true) {
                logError(`WARNING: Fallback match worked for [${mobile}]. Fixing auth flow.`);
            } else {
                return res.status(401).json({ message: 'Invalid mobile or password' });
            }
        }

        logError(`User found: ${user.name} (Role: ${user.role})`);

        if (user.isFreelancer) {
            logError(`Access denied: User ${user.mobile} is marked as Freelancer.`);
            return res.status(401).json({ message: 'Freelancers cannot log in to the portal. Please contact admin.' });
        }

        if (!user.password) {
            logError('User has no password set');
            return res.status(401).json({ message: 'No password set for this account. Please contact admin.' });
        }

        // DEBUG: Log password matching details
        const pwd = password ? password.trim() : '';
        const isMatch = await user.matchPassword(pwd);
        logError(`Match debug: receivedPwdLen=${pwd.length}, dbHashStart=${user.password.substring(0, 10)}, isMatch=${isMatch}`);

        if (isMatch) {
            logError('Password matched');
            
            // 🛡️ SECURITY: Check if user's company is suspended
            if (user.company) {
                const compStatus = user.company.status?.toLowerCase();
                logError(`DEBUG: Company status in DB is: "${user.company.status}" (Normalized: "${compStatus}")`);
                
                if (compStatus === 'suspended') {
                    logError(`Login blocked: Company ${user.company.name} is SUSPENDED.`);
                    return res.status(403).json({ 
                        message: 'This account has been suspended by the administrator. Please contact support.' 
                    });
                }
            } else {
                logError('DEBUG: User has no company associated.');
            }

            if (user.status === 'blocked') {
                return res.status(401).json({ message: 'Your account is blocked. Please contact admin.' });
            }

            res.json({
                _id: user._id,
                name: user.name,
                mobile: user.mobile,
                role: user.role,
                company: user.company,
                salary: user.salary,
                monthlyLeaveAllowance: user.monthlyLeaveAllowance,
                permissions: user.permissions,
                token: generateToken(user._id),
            });
        } else {
            logError('Invalid credentials');
            res.status(401).json({ message: 'Invalid mobile or password' });
        }
    } catch (error) {
        logError(`Login Exception: ${error.message} \nStack: ${error.stack}`);
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Bridge login from Super Admin
// @route   POST /api/auth/bridge-login
// @access  Public (Token verified internally)
const bridgeLogin = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: 'No bridge token provided' });

        const secret = process.env.SUPER_ADMIN_BRIDGE_SECRET || 'fallback_bridge_secret';
        const decoded = jwt.verify(token, secret);

        if (!decoded || !decoded.id) {
            return res.status(401).json({ message: 'Invalid bridge token payload' });
        }

        const user = await User.findById(decoded.id).populate('company');
        if (!user) {
            return res.status(404).json({ message: 'User for this bridge not found' });
        }

        res.json({
            _id: user._id,
            name: user.name,
            mobile: user.mobile,
            role: user.role,
            company: user.company,
            salary: user.salary,
            monthlyLeaveAllowance: user.monthlyLeaveAllowance,
            permissions: user.permissions,
            token: generateToken(user._id),
            isProxy: true
        });
    } catch (error) {
        console.error('BridgeLogin Error:', error);
        res.status(401).json({ message: 'Bridge authentication failed', error: error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id).populate('company');

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            mobile: user.mobile,
            role: user.role,
            company: user.company,
            salary: user.salary,
            monthlyLeaveAllowance: user.monthlyLeaveAllowance,
            permissions: user.permissions
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// Helper to seed companies (Optional, but useful for setup)
const seedCompanies = async (req, res) => {
    const companies = ['YatreeDestination'];
    for (let name of companies) {
        await Company.findOneAndUpdate({ name }, { name }, { upsert: true });
    }
    res.json({ message: 'Companies seeded' });
};

// @desc    Get all companies
// @route   GET /api/auth/companies
// @access  Private
const getCompanies = async (req, res) => {
    try {
        let query = {};
        
        // 🔒 MULTI-TENANCY LOCK: Only ROOT SuperAdmin sees all companies
        // All Client Admins/Executives only see their OWN company
        if (req.user && req.user.role === 'SuperAdmin') {
            query = {}; 
        } else {
            const userCompanyId = req.user?.company?._id || req.user?.company;
            if (userCompanyId) {
                query._id = userCompanyId;
            } else {
                return res.json([]);
            }
        }

        console.log(`GET COMPANIES REQUEST RECEIVED (${req.user?.role || 'User'} role)`);
        const companies = await Company.find(query).sort({ name: 1 });
        console.log('COMPANIES FOUND:', companies.length);
        res.json(companies);
    } catch (error) {
        console.error('getCompanies FATAL ERROR:', error);
        logError(`getCompanies Error: ${error.message} \nStack: ${error.stack}`);
        res.status(500).json({ message: 'Server error fetching companies', error: error.message });
    }
};

const SubscriptionPayment = require('../models/SubscriptionPayment');

// @desc    Change user password
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Both old and new passwords are required' });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await user.matchPassword(oldPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid current password' });
        }

        // The pre-save hook in the User model will handle the hashing
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('ChangePassword Error:', error);
        res.status(500).json({ message: 'Server error during password update', error: error.message });
    }
};

// @desc    Get subscription payment history
// @route   GET /api/auth/subscription-history
// @access  Private
const getSubscriptionHistory = async (req, res) => {
    try {
        const history = await SubscriptionPayment.find({ company: req.user.company })
            .sort({ month: -1 })
            .limit(12);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payment history', error: error.message });
    }
};

// @desc    Process subscription payment (Simplified production logic)
// @route   POST /api/auth/process-payment
// @access  Private
const processSubscriptionPayment = async (req, res) => {
    try {
        const { amount, month, paymentMethod } = req.body;
        
        // Mocking a successful gateway transations ID for production logic
        const transactionRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const payment = await SubscriptionPayment.create({
            company: req.user.company,
            user: req.user._id,
            month: month || new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
            amount: amount || 2500,
            transactionRef,
            paymentMethod: paymentMethod || 'Online',
            status: 'Paid'
        });

        res.status(201).json({ 
            message: 'Payment processed successfully', 
            payment 
        });
    } catch (error) {
        res.status(500).json({ message: 'Payment processing failed', error: error.message });
    }
};

module.exports = {
    loginUser,
    getUserProfile,
    seedCompanies,
    getCompanies,
    bridgeLogin,
    changePassword,
    getSubscriptionHistory,
    processSubscriptionPayment
};
