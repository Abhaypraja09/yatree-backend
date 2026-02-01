const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');

const generateToken = (id) => {
    return jwt.sign({ id: id.toString() }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const fs = require('fs');
const path = require('path');

const logError = (msg) => {
    try {
        // Use process.cwd() for cross-platform compatibility
        const logPath = path.join(process.cwd(), 'server_debug.log');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
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
        logError(`Mobile: ${mobile}`);

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is missing');
        }

        const user = await User.findOne({ mobile }).populate('company');

        if (!user) {
            logError('User not found');
            return res.status(401).json({ message: 'Invalid mobile or password' });
        }

        if (user.isFreelancer) {
            logError('Freelancer attempted login');
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
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// Helper to seed companies (Optional, but useful for setup)
const seedCompanies = async (req, res) => {
    const companies = ['YatreeDestination', 'GoGetGo'];
    for (let name of companies) {
        await Company.findOneAndUpdate({ name }, { name }, { upsert: true });
    }
    res.json({ message: 'Companies seeded' });
};

// @desc    Get all companies
// @route   GET /api/auth/companies
// @access  Private
const getCompanies = async (req, res) => {
    const companies = await Company.find({});
    res.json(companies);
};

module.exports = {
    loginUser,
    getUserProfile,
    seedCompanies,
    getCompanies
};
