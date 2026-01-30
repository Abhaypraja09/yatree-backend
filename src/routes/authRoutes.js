const express = require('express');
const router = express.Router();
const {
    loginUser,
    getUserProfile,
    seedCompanies,
    getCompanies
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.get('/companies', protect, getCompanies);
router.post('/seed-companies', seedCompanies);

module.exports = router;
