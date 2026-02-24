const asyncHandler = require('express-async-handler');
const StaffAttendance = require('../models/StaffAttendance');
const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const { DateTime } = require('luxon');

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
};

// @desc    Staff Punch In
// @route   POST /api/staff/punch-in
// @access  Private/Staff
const staffPunchIn = asyncHandler(async (req, res) => {
    const { latitude, longitude, address, photo } = req.body;
    const today = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');

    let attendance = await StaffAttendance.findOne({
        staff: req.user._id,
        date: today
    });

    if (attendance) {
        return res.status(400).json({ message: 'Today\'s attendance already exists (Punched In).' });
    }

    // Geofencing Check
    const user = await User.findById(req.user._id);
    if (user.officeLocation && user.officeLocation.latitude) {
        const distance = calculateDistance(
            latitude,
            longitude,
            user.officeLocation.latitude,
            user.officeLocation.longitude
        );

        const radius = user.officeLocation.radius || 200;
        if (distance > radius) {
            return res.status(400).json({
                message: `You are too far from the office (${Math.round(distance)}m). Distance allowed: ${radius}m.`
            });
        }
    }

    // Check if on leave
    const onLeave = await LeaveRequest.findOne({
        staff: req.user._id,
        startDate: { $lte: today },
        endDate: { $gte: today },
        status: 'Approved'
    });

    if (onLeave) {
        return res.status(400).json({
            message: 'You are on leave today and cannot punch in.',
            leaveType: onLeave.type
        });
    }

    attendance = await StaffAttendance.create({
        staff: req.user._id,
        company: req.user.company?._id || req.user.company,
        date: today,
        punchIn: {
            time: new Date(),
            location: { latitude, longitude, address },
            photo
        },
        status: 'present'
    });

    res.status(201).json(attendance);
});

// @desc    Staff Punch Out
// @route   POST /api/staff/punch-out
// @access  Private/Staff
const staffPunchOut = asyncHandler(async (req, res) => {
    const { latitude, longitude, address, photo } = req.body;
    const today = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');

    const attendance = await StaffAttendance.findOne({
        staff: req.user._id,
        date: today
    });

    if (!attendance) {
        return res.status(400).json({ message: 'No punch-in record found for today. Please punch in first.' });
    }

    // Geofencing Check
    const user = await User.findById(req.user._id);
    if (user.officeLocation && user.officeLocation.latitude) {
        const distance = calculateDistance(
            latitude,
            longitude,
            user.officeLocation.latitude,
            user.officeLocation.longitude
        );

        const radius = user.officeLocation.radius || 200;
        if (distance > radius) {
            return res.status(400).json({
                message: `You are too far from the office (${Math.round(distance)}m). Distance allowed: ${radius}m.`
            });
        }
    }

    if (attendance.punchOut && attendance.punchOut.time) {
        return res.status(400).json({ message: 'Already punched out for today.' });
    }

    attendance.punchOut = {
        time: new Date(),
        location: { latitude, longitude, address },
        photo
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

// @desc    Request Leave
// @route   POST /api/staff/leave
// @access  Private/Staff
const requestLeave = asyncHandler(async (req, res) => {
    const { startDate, endDate, reason, type } = req.body;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start and end dates are required.' });
    }

    const leave = await LeaveRequest.create({
        staff: req.user._id,
        company: req.user.company?._id || req.user.company,
        startDate,
        endDate,
        reason,
        type: type || 'Full Day'
    });

    res.status(201).json(leave);
});

// @desc    Get Staff Leave History
// @route   GET /api/staff/leaves
// @access  Private/Staff
const getStaffLeaves = asyncHandler(async (req, res) => {
    const leaves = await LeaveRequest.find({ staff: req.user._id })
        .sort({ createdAt: -1 });
    res.json(leaves);
});

// @desc    Get Staff Monthly Report
// @route   GET /api/staff/report
// @access  Private/Staff
const getStaffReport = asyncHandler(async (req, res) => {
    const { month, year } = req.query;
    const now = DateTime.now().setZone('Asia/Kolkata');
    const m = month || now.month.toString();
    const y = year || now.year.toString();

    const startStr = `${y}-${m.padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endStr = `${y}-${m.padStart(2, '0')}-${lastDay}`;

    const monthAttendance = await StaffAttendance.find({
        staff: req.user._id,
        date: { $gte: startStr, $lte: endStr }
    });

    const s = await User.findById(req.user._id);
    const presentDays = monthAttendance.filter(a => a.status === 'present').length;
    const halfDays = monthAttendance.filter(a => a.status === 'half-day').length;
    const effectivePresent = presentDays + (halfDays * 0.5);

    // Calculate Sundays worked
    let sundaysWorked = 0;
    monthAttendance.forEach(att => {
        if (new Date(att.date).getDay() === 0) sundaysWorked++;
    });

    const daysInMonth = new Date(y, m, 0).getDate();
    const isCurrentMonth = now.year === parseInt(y) && now.month === parseInt(m);
    const daysToConsider = isCurrentMonth ? now.day : daysInMonth;

    let sundaysPassed = 0;
    for (let d = 1; d <= daysToConsider; d++) {
        if (new Date(y, m - 1, d).getDay() === 0) sundaysPassed++;
    }

    const workingDaysPassed = daysToConsider - sundaysPassed;

    // Regular attendance (non-Sundays)
    const regularPresents = monthAttendance.filter(a => new Date(a.date).getDay() !== 0);
    const regularEffectivePresent = regularPresents.filter(a => a.status === 'present').length + (regularPresents.filter(a => a.status === 'half-day').length * 0.5);

    const totalAbsences = Math.max(0, workingDaysPassed - regularEffectivePresent);
    const allowance = s.monthlyLeaveAllowance || 4;
    const extraLeaves = Math.max(0, totalAbsences - allowance);

    const perDaySalary = (s.salary || 0) / 26;
    const deduction = extraLeaves * perDaySalary;
    const sundayBonus = sundaysWorked * perDaySalary;
    const finalSalary = Math.max(0, (s.salary || 0) - deduction + sundayBonus);

    res.json({
        month: m,
        year: y,
        presentDays: effectivePresent,
        halfDays,
        sundaysWorked,
        workingDaysPassed,
        allowance,
        leavesTaken: totalAbsences,
        extraLeaves,
        salary: s.salary,
        deduction: Math.round(deduction),
        sundayBonus: Math.round(sundayBonus),
        finalSalary: Math.round(finalSalary),
        remainingLeaves: Math.max(0, allowance - totalAbsences)
    });
});

module.exports = {
    staffPunchIn,
    staffPunchOut,
    getStaffStatus,
    getStaffHistory,
    requestLeave,
    getStaffLeaves,
    getStaffReport
};
