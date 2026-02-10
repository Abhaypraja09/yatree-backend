const express = require('express');
const router = express.Router();
const {
    getDriverDashboard,
    punchIn,
    punchOut,
    requestNewTrip,
    addExpense,
    getDriverLedger
} = require('../controllers/driverController');
const { protect, driver } = require('../middleware/authMiddleware');
const { storage } = require('../config/cloudinary');
const multer = require('multer');
const upload = multer({ storage });

router.use(protect);
router.use(driver);

router.get('/dashboard', getDriverDashboard);
router.post('/punch-in', upload.fields([
    { name: 'selfie', maxCount: 1 },
    { name: 'kmPhoto', maxCount: 1 },
    { name: 'carSelfie', maxCount: 1 }
]), punchIn);

router.post('/punch-out', upload.fields([
    { name: 'selfie', maxCount: 1 },
    { name: 'kmPhoto', maxCount: 1 },
    { name: 'carSelfie', maxCount: 1 },
    { name: 'fuelSlips', maxCount: 10 },
    { name: 'parkingSlips', maxCount: 10 }
]), punchOut);

router.post('/request-trip', requestNewTrip);
router.post('/add-expense', upload.any(), addExpense);
router.get('/ledger', getDriverLedger);

module.exports = router;
