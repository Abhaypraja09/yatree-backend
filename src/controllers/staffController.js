const asyncHandler = require('express-async-handler');
const StaffAttendance = require('../models/StaffAttendance');
const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const { DateTime } = require('luxon');

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Get salary cycle dates based on joining date and a target cycle index.
 * 
 * Example: joiningDate = Jan 5, 2026
 *   cycle 0 (current/first cycle):  Jan 5 → Feb 4
 *   cycle -1 (previous cycle):      Dec 5 → Jan 4
 *   cycle -2 (cycle before that):   Nov 5 → Dec 4
 * 
 * @param {Date} joiningDate 
 * @param {number} cycleOffset - 0 = current cycle, -1 = previous, etc.
 * @returns {{ cycleStart: string, cycleEnd: string, cycleLabel: string }}
 */
function getCycleForDate(joiningDate, referenceDate) {
    const jd = DateTime.fromJSDate(joiningDate).setZone('Asia/Kolkata');
    const ref = DateTime.fromJSDate(referenceDate || new Date()).setZone('Asia/Kolkata');
    const joinDay = jd.day;

    // Find what cycle the reference date falls into
    // A cycle starts on joinDay of some month and ends on (joinDay-1) of next month
    let cycleStart;
    if (ref.day >= joinDay) {
        // We're in the cycle that started this month
        cycleStart = ref.startOf('month').set({ day: joinDay });
    } else {
        // We're in the cycle that started last month
        cycleStart = ref.minus({ months: 1 }).startOf('month').set({ day: joinDay });
    }

    // Cycle end is one day before the next cycle start
    const cycleEnd = cycleStart.plus({ months: 1 }).minus({ days: 1 });

    return {
        cycleStart: cycleStart.toFormat('yyyy-MM-dd'),
        cycleEnd: cycleEnd.toFormat('yyyy-MM-dd'),
        cycleLabel: `${cycleStart.toFormat('dd MMM yyyy')} → ${cycleEnd.toFormat('dd MMM yyyy')}`
    };
}

/**
 * Get a specific past cycle by offset.
 * offset 0 = current cycle, -1 = previous cycle, etc.
 */
function getCycleByOffset(joiningDate, offset) {
    const now = DateTime.now().setZone('Asia/Kolkata');
    const refDate = now.minus({ months: Math.abs(offset) }).toJSDate();
    return getCycleForDate(joiningDate, offset === 0 ? now.toJSDate() : refDate);
}

// @desc    Staff Punch In
// @route   POST /api/staff/punch-in
// @access  Private/Staff
const staffPunchIn = asyncHandler(async (req, res) => {
    const { latitude, longitude, address, photo } = req.body;
    const today = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');

    let attendance = await StaffAttendance.findOne({ staff: req.user._id, date: today });
    if (attendance) {
        return res.status(400).json({ message: 'Today\'s attendance already exists (Punched In).' });
    }

    const user = await User.findById(req.user._id);

    // Geofencing deactivated as per user request — auditing only
    if (user.officeLocation && (user.officeLocation.latitude || user.officeLocation.address)) {
        const staffLat = Number(latitude);
        const staffLon = Number(longitude);
        const officeLat = Number(user.officeLocation.latitude);
        const officeLon = Number(user.officeLocation.longitude);
        const radius = Number(user.officeLocation.radius) > 0 ? Number(user.officeLocation.radius) : 200;

        if (staffLat && staffLon && officeLat && officeLon) {
            const distance = calculateDistance(staffLat, staffLon, officeLat, officeLon);
            console.log(`[GEO_AUDIT] Staff: ${user.name} | Dist: ${Math.round(distance)}m | Status: ALLOWED (Restriction Disabled)`);
        }
    }

    // Leave check
    const onLeave = await LeaveRequest.findOne({
        staff: req.user._id,
        startDate: { $lte: today },
        endDate: { $gte: today },
        status: 'Approved'
    });

    if (onLeave) {
        console.log(`[STAFF_PUNCH] Blocking punch-in for ${req.user.name} - on approved leave (${onLeave.type})`);
        return res.status(403).json({
            message: `You are on approved leave (${onLeave.type}) which is active today. Punch-in restricted.`,
            leaveType: onLeave.type
        });
    }

    // Safety check: Even if LeaveRequest didn't catch it, check if an 'absent' record exists
    if (attendance && attendance.status === 'absent') {
        return res.status(403).json({ message: 'You are marked as ABSENT for today (Leave Approval). Cannot punch in.' });
    }

    attendance = await StaffAttendance.create({
        staff: req.user._id,
        company: req.user.company?._id || req.user.company,
        date: today,
        punchIn: { time: new Date(), location: { latitude, longitude, address }, photo },
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

    const attendance = await StaffAttendance.findOne({ staff: req.user._id, date: today });
    if (!attendance) {
        return res.status(400).json({ message: 'No punch-in record found for today. Please punch in first.' });
    }

    const user = await User.findById(req.user._id);
    // Geofencing deactivated — checkout logic preserved for telemetry only
    if (user.officeLocation && (user.officeLocation.latitude || user.officeLocation.address)) {
        const staffLat = Number(latitude);
        const staffLon = Number(longitude);
        const officeLat = Number(user.officeLocation.latitude);
        const officeLon = Number(user.officeLocation.longitude);

        if (staffLat && staffLon && officeLat && officeLon) {
            const distance = calculateDistance(staffLat, staffLon, officeLat, officeLon);
            console.log(`[GEO_AUDIT_OUT] Staff: ${user.name} | Dist: ${Math.round(distance)}m | Status: ALLOWED`);
        }
    }

    if (attendance.punchOut && attendance.punchOut.time) {
        return res.status(400).json({ message: 'Already punched out for today.' });
    }

    attendance.punchOut = { time: new Date(), location: { latitude, longitude, address }, photo };
    await attendance.save();
    res.json(attendance);
});

// @desc    Get Current Status
// @route   GET /api/staff/status
// @access  Private/Staff
const getStaffStatus = asyncHandler(async (req, res) => {
    const today = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
    const attendance = await StaffAttendance.findOne({ staff: req.user._id, date: today });
    const staff = await User.findById(req.user._id).select('-password');
    res.json({
        attendance,
        staff,
        message: attendance ? 'Already Punched' : 'Not punched in'
    });
});

// @desc    Get Staff History (last 60 records)
// @route   GET /api/staff/history
// @access  Private/Staff
const getStaffHistory = asyncHandler(async (req, res) => {
    const history = await StaffAttendance.find({ staff: req.user._id })
        .sort({ date: -1 })
        .limit(60);
    res.json(history);
});

// @desc    Request Leave
// @route   POST /api/staff/leave
const requestLeave = asyncHandler(async (req, res) => {
    const { startDate, endDate, reason, type } = req.body;
    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start and end dates are required.' });
    }
    const leave = await LeaveRequest.create({
        staff: req.user._id,
        company: req.user.company?._id || req.user.company,
        startDate, endDate, reason,
        type: type || 'Full Day'
    });
    res.status(201).json(leave);
});

// @desc    Get Staff Leave History
// @route   GET /api/staff/leaves
const getStaffLeaves = asyncHandler(async (req, res) => {
    const leaves = await LeaveRequest.find({ staff: req.user._id }).sort({ createdAt: -1 });
    res.json(leaves);
});

/**
 * Core salary calculation for a given cycle (joining-date based).
 */
async function calculateSalaryForCycle(staffUser, cycleStart, cycleEnd) {
    const today = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
    const effectiveEnd = cycleEnd > today ? today : cycleEnd;

    const attendance = await StaffAttendance.find({
        staff: staffUser._id,
        date: { $gte: cycleStart, $lte: effectiveEnd }
    });

    const csDate = DateTime.fromISO(cycleStart);
    const ceDate = DateTime.fromISO(effectiveEnd);

    let workingDaysPassed = 0;
    let d = csDate;
    while (d <= ceDate) {
        if (staffUser.staffType === 'Hotel' || d.weekday !== 7) {
            workingDaysPassed++;
        }
        d = d.plus({ days: 1 });
    }

    const presentDays = attendance.filter(a => a.status === 'present').length;
    const halfDays = attendance.filter(a => a.status === 'half-day').length;
    const totalEffectivePresent = presentDays + (halfDays * 0.5);

    // Sundays Worked (for Company staff, this is a bonus)
    const sundaysWorked = attendance.filter(a => {
        const day = DateTime.fromISO(a.date).weekday;
        return day === 7 && a.status === 'present';
    }).length;

    // Absences: Compared against required working days
    // For Hotel staff, workingDaysPassed includes Sundays.
    // For Company staff, workingDaysPassed excludes Sundays.
    const totalAbsences = Math.max(0, workingDaysPassed - totalEffectivePresent);

    const allowance = staffUser.monthlyLeaveAllowance || 4;
    const paidLeavesUsed = Math.min(totalAbsences, allowance);
    const unpaidLeaves = Math.max(0, totalAbsences - allowance);

    const baseSalary = staffUser.salary || 0;
    const perDaySalary = baseSalary / 30; // 30 day basis

    // New Calculation Logic:
    // If Hotel staff: Worked days (all) + Paid Leaves allowance
    // If Company staff: Worked days (Mon-Sat) + Paid Leaves allowance + Sunday Bonus
    // Actually, (totalEffectivePresent + paidLeavesUsed) covers it for both if workingDaysPassed is correct.
    const finalSalary = (totalEffectivePresent + paidLeavesUsed) * perDaySalary;

    return {
        cycleStart,
        cycleEnd,
        effectiveEnd,
        presentDays: totalEffectivePresent,
        halfDays,
        sundaysWorked,
        workingDaysPassed,
        leavesTaken: totalAbsences,
        allowance,
        paidLeavesUsed,
        extraLeaves: unpaidLeaves,
        salary: baseSalary,
        perDaySalary: Math.round(perDaySalary),
        totalEarned: Math.round(finalSalary),
        finalSalary: Math.round(finalSalary),
        deduction: Math.round(unpaidLeaves * perDaySalary),
        sundayBonus: staffUser.staffType === 'Hotel' ? 0 : Math.round(sundaysWorked * perDaySalary),
        attendanceData: attendance
    };
}

// @desc    Get Staff Salary Report (joining-date cycle based)
// @route   GET /api/staff/report?cycleOffset=0  (0=current, -1=prev, -2=prev-prev)
// @access  Private/Staff
const getStaffReport = asyncHandler(async (req, res) => {
    const s = await User.findById(req.user._id);
    const now = DateTime.now().setZone('Asia/Kolkata');

    // Default joining date = account creation date if not set
    const joiningDate = s.joiningDate ? new Date(s.joiningDate) : new Date(s.createdAt);

    const cycleOffset = parseInt(req.query.cycleOffset || '0');

    // Build cycle dates
    const joinDay = DateTime.fromJSDate(joiningDate).setZone('Asia/Kolkata').day;
    let cycleStartDT;
    if (cycleOffset === 0) {
        // Current cycle
        if (now.day >= joinDay) {
            cycleStartDT = now.startOf('month').set({ day: joinDay });
        } else {
            cycleStartDT = now.minus({ months: 1 }).startOf('month').set({ day: joinDay });
        }
    } else {
        // Past cycles
        if (now.day >= joinDay) {
            cycleStartDT = now.startOf('month').set({ day: joinDay }).minus({ months: Math.abs(cycleOffset) });
        } else {
            cycleStartDT = now.minus({ months: 1 }).startOf('month').set({ day: joinDay }).minus({ months: Math.abs(cycleOffset) });
        }
    }

    const cycleEndDT = cycleStartDT.plus({ months: 1 }).minus({ days: 1 });
    const cycleStart = cycleStartDT.toFormat('yyyy-MM-dd');
    const cycleEnd = cycleEndDT.toFormat('yyyy-MM-dd');

    const result = await calculateSalaryForCycle(s, cycleStart, cycleEnd);

    res.json({
        ...result,
        cycleLabel: `${cycleStartDT.toFormat('dd MMM yyyy')} → ${cycleEndDT.toFormat('dd MMM yyyy')}`,
        joiningDate: joiningDate.toISOString(),
        joiningDay: joinDay,
        // Keep month/year for backward compat
        month: cycleStartDT.month.toString(),
        year: cycleStartDT.year.toString(),
    });
});

// @desc    Get all past salary cycles for staff (last 12)
// @route   GET /api/staff/salary-cycles
// @access  Private/Staff
const getStaffSalaryCycles = asyncHandler(async (req, res) => {
    const s = await User.findById(req.user._id);
    const now = DateTime.now().setZone('Asia/Kolkata');
    const joiningDate = s.joiningDate ? new Date(s.joiningDate) : new Date(s.createdAt);
    const joinDT = DateTime.fromJSDate(joiningDate).setZone('Asia/Kolkata');
    const joinDay = joinDT.day;

    // Current cycle start
    let cycleStartDT;
    if (now.day >= joinDay) {
        cycleStartDT = now.startOf('month').set({ day: joinDay });
    } else {
        cycleStartDT = now.minus({ months: 1 }).startOf('month').set({ day: joinDay });
    }

    const cycles = [];
    const totalCyclesElapsed = Math.floor(cycleStartDT.diff(joinDT, 'months').months);
    const cyclesToShow = Math.max(1, Math.min(totalCyclesElapsed + 1, 12));

    for (let i = 0; i < cyclesToShow; i++) {
        const cStart = cycleStartDT.minus({ months: i }).startOf('day');
        const cEnd = cStart.plus({ months: 1 }).minus({ days: 1 }).endOf('day');

        // Don't show cycles before joining date (compare only dates)
        if (cStart.toISODate() < joinDT.toISODate()) break;

        const data = await calculateSalaryForCycle(s, cStart.toFormat('yyyy-MM-dd'), cEnd.toFormat('yyyy-MM-dd'));
        cycles.push({
            ...data,
            cycleLabel: `${cStart.toFormat('dd MMM yyyy')} → ${cEnd.toFormat('dd MMM yyyy')}`,
            isCurrent: i === 0
        });
    }

    res.json(cycles);
});

module.exports = {
    staffPunchIn,
    staffPunchOut,
    getStaffStatus,
    getStaffHistory,
    requestLeave,
    getStaffLeaves,
    getStaffReport,
    getStaffSalaryCycles
};
