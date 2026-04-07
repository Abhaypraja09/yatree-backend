const express = require('express');
const router = express.Router();
const {
    loginUser,
    getUserProfile,
    seedCompanies,
    getCompanies,
    bridgeLogin,
    changePassword,
    getSubscriptionHistory,
    processSubscriptionPayment
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/bridge-login', bridgeLogin);
router.post('/login', loginUser);
router.post('/change-password', protect, changePassword);
router.get('/subscription-history', protect, getSubscriptionHistory);
router.post('/process-payment', protect, processSubscriptionPayment);
router.get('/profile', protect, getUserProfile);
router.get('/companies', protect, getCompanies);
router.post('/seed-companies', seedCompanies);

module.exports = router;
