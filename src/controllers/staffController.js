const asyncHandler = require('express-async-handler');
const StaffAttendance = require('../models/StaffAttendance');
const User = require('../models/User');
const { DateTime } = require('luxon');

// @desc    Staff Punch In
// @route   POST /api/staff/punch-in
// @access  Private/Staff
const staffPunchIn = asyncHandler(async (req, res) => {
    const { latitude, longitude, address } = req.body;
    const today = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');

    let attendance = await StaffAttendance.findOne({
        staff: req.user._id,
        date: today
    });

    if (attendance) {
        return res.status(400).json({ message: 'Today\'s attendance already exists (Punched In).' });
    }

    attendance = await StaffAttendance.create({
        staff: req.user._id,
        company: req.user.company?._id || req.user.company,
        date: today,
        punchIn: {
            time: new Date(),
            location: { latitude, longitude, address }
        },
        status: 'present'
    });

    res.status(201).json(attendance);
});

// @desc    Staff Punch Out
// @route   POST /api/staff/punch-out
// @access  Private/Staff
const staffPunchOut = asyncHandler(async (req, res) => {
    const { latitude, longitude, address } = req.body;
    const today = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');

    const attendance = await StaffAttendance.findOne({
        staff: req.user._id,
        date: today
    });

    if (!attendance) {
        return res.status(400).json({ message: 'No punch-in record found for today. Please punch in first.' });
    }

    if (attendance.punchOut && attendance.punchOut.time) {
        return res.status(400).json({ message: 'Already punched out for today.' });
    }

    attendance.punchOut = {
        time: new Date(),
        location: { latitude, longitude, address }
    };

    await attendance.save();
    res.json(attendance);
});

// @desc    Get Current Status
// @route   GET /api/staff/status
// @access  Private/Staff
const getStaffStatus = asyncHandler(async (req, res) => {
    const today = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
    const attendance = await StaffAttendance.findOne({
        staff: req.user._id,
        date: today
    });

    res.json(attendance || { message: 'Not punched in' });
});

// @desc    Get Staff History
// @route   GET /api/staff/history
// @access  Private/Staff
const getStaffHistory = asyncHandler(async (req, res) => {
    const history = await StaffAttendance.find({ staff: req.user._id })
        .sort({ date: -1 })
        .limit(30);
    res.json(history);
});

module.exports = {
    staffPunchIn,
    staffPunchOut,
    getStaffStatus,
    getStaffHistory
};
