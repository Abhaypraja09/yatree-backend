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

            // Try to get public IP for debugging
            let public_ip = 'unknown';
            try {
                const axios = require('axios');
                const ipRes = await axios.get('https://api.ipify.org?format=json', { timeout: 3000 });
                public_ip = ipRes.data.ip;
            } catch (e) { }

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

            return res.status(503).json({
                message: 'Database is still connecting or unavailable. Please wait 10 seconds and try again.',
                error: `Database is ${currentState}. Ensure IP ${public_ip} is whitelisted. If already whitelisted, this is a Hostinger DNS issue - please use the Standard Connection String.`,
                debug_info: {
                    db_status: currentState,
                    public_ip,
                    check_url: '/api/db-check'
                }
            });
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

        if (await user.matchPassword(password)) {
            logError('Password matched');
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
        
        // 🔒 MULTI-TENANCY LOCK: Only SuperAdmin sees all companies
        // Everyone else only sees their own assigned company
        if (req.user && (req.user.role === 'SuperAdmin' || req.user.role === 'Admin')) {
            query = {}; 
        } else {
            const userCompanyId = req.user?.company?._id || req.user?.company;
            if (userCompanyId) {
                query._id = userCompanyId;
            } else {
                // If user has no company assigned, return empty list to be safe
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

module.exports = {
    loginUser,
    getUserProfile,
    seedCompanies,
    getCompanies
};
