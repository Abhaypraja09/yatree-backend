const express = require('express');
const router = express.Router();
const {
    staffPunchIn,
    staffPunchOut,
    getStaffStatus,
    getStaffHistory,
    requestLeave,
    getStaffLeaves,
    getStaffReport,
    getStaffSalaryCycles
} = require('../controllers/staffController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/punch-in', staffPunchIn);
router.post('/punch-out', staffPunchOut);
router.get('/status', getStaffStatus);
router.get('/history', getStaffHistory);
router.post('/leave', requestLeave);
router.get('/leaves', getStaffLeaves);
router.get('/report', getStaffReport);
router.get('/salary-cycles', getStaffSalaryCycles);

module.exports = router;
