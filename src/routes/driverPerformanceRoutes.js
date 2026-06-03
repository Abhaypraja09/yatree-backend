const express = require('express');
const router = express.Router();
const {
    addPerformanceRecord,
    getDriverPerformance,
    getCompanyPerformance,
    updatePerformanceRecord,
    deletePerformanceRecord
} = require('../controllers/driverPerformanceController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, admin, addPerformanceRecord);

router.route('/company/:companyId')
    .get(protect, admin, getCompanyPerformance);

router.route('/:driverId')
    .get(protect, admin, getDriverPerformance);

router.route('/:id')
    .put(protect, admin, updatePerformanceRecord)
    .delete(protect, admin, deletePerformanceRecord);

module.exports = router;
