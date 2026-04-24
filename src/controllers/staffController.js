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
        if (attendance.status === 'absent') {
            return res.status(403).json({
                message: 'Punch-in restricted. You are marked as ABSENT today (Approved Leave).',
                status: 'absent'
            });
        }
        return res.status(400).json({ message: 'Today\'s attendance already exists (Punched In).' });
    }

    const user = await User.findById(req.user._id);

    // Geofencing enforcement
    if (user.officeLocation && user.officeLocation.latitude && user.officeLocation.longitude) {
        const staffLat = Number(latitude);
        const staffLon = Number(longitude);
        const officeLat = Number(user.officeLocation.latitude);
        const officeLon = Number(user.officeLocation.longitude);
        const radius = Number(user.officeLocation.radius) > 0 ? Number(user.officeLocation.radius) : 200;

        if (staffLat && staffLon) {
            const distance = calculateDistance(staffLat, staffLon, officeLat, officeLon);
            if (distance > radius) {
                console.log(`[GEO_BLOCK] Staff: ${user.name} | Dist: ${Math.round(distance)}m | Radius: ${radius}m | Status: REJECTED`);
                return res.status(403).json({
                    message: `Punch-in restricted. You are ${Math.round(distance)}m away from the office. Please reach the office to punch in.`,
                    distance: Math.round(distance),
                    requiredRadius: radius
                });
            }
            console.log(`[GEO_ALLOW] Staff: ${user.name} | Dist: ${Math.round(distance)}m | Radius: ${radius}m | Status: ALLOWED`);
        } else {
            return res.status(400).json({ message: 'GPS coordinates are required for geofenced punch-in.' });
        }
    }

    // Double check LeaveRequest collection for active approved leaves
    const onLeave = await LeaveRequest.findOne({
        staff: req.user._id,
        startDate: { $lte: today },
        endDate: { $gte: today },
        status: 'Approved'
    });

    if (onLeave) {
        // If we found a leave but no attendance record yet, create an absent record now to sync
        await StaffAttendance.findOneAndUpdate(
            { staff: req.user._id, date: today },
            { status: 'absent', company: req.user.company?._id || req.user.company },
            { upsert: true }
        );

        console.log(`[STAFF_PUNCH] Blocking punch-in for ${req.user.name} - on approved leave (${onLeave.type})`);
        return res.status(403).json({
            message: `Punch-in restricted. You are on approved leave (${onLeave.type}) today.`,
            leaveType: onLeave.type
        });
    }

    try {
        attendance = await StaffAttendance.create({
            staff: req.user._id,
            company: req.user.company?._id || req.user.company,
            date: today,
            punchIn: { time: new Date(), location: { latitude, longitude, address }, photo },
            status: 'present'
        });
        console.log(`[STAFF_PUNCH] SUCCESS: ${req.user.name} Punched In at ${today}`);
        res.status(201).json(attendance);
    } catch (createError) {
        console.error(`[STAFF_PUNCH] FAILED: ${req.user.name} create error:`, createError.message);
        if (createError.code === 11000) {
            return res.status(400).json({ message: 'Today\'s attendance already exists (Duplicate Signal).' });
        }
        throw createError;
    }
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

    if (attendance.status === 'absent') {
        return res.status(403).json({
            message: 'Action restricted. You are marked as ABSENT today (Approved Leave).',
            status: 'absent'
        });
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

    // Check for active approved leave
    const leave = await LeaveRequest.findOne({
        staff: req.user._id,
        startDate: { $lte: today },
        endDate: { $gte: today },
        status: 'Approved'
    });

    let message = 'Not punched in';
    if (leave) {
        message = `On Approved Leave (${leave.type})`;
    } else if (attendance) {
        if (attendance.status === 'absent') {
            message = 'Marked ABSENT (Leave Policy)';
        } else if (attendance.punchOut?.time) {
            message = 'Work Shift Completed';
        } else {
            message = 'Active - Punched In';
        }
    }

    res.json({
        attendance,
        staff,
        onLeave: !!leave || (attendance?.status === 'absent'),
        leaveDetails: leave ? { type: leave.type, reason: leave.reason } : null,
        message
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
    const csDate = DateTime.fromISO(cycleStart).setZone('Asia/Kolkata');
    const ceDate = DateTime.fromISO(cycleEnd).setZone('Asia/Kolkata');
    const effectiveEndDT = ceDate > DateTime.fromISO(today) ? DateTime.fromISO(today) : ceDate;
    const effectiveEnd = effectiveEndDT.toFormat('yyyy-MM-dd');

    const [attendance, allApprovedLeaves] = await Promise.all([
        StaffAttendance.find({
            staff: staffUser._id,
            date: { $gte: cycleStart, $lte: cycleEnd } // Fetch full cycle for better visibility
        }).lean(),
        LeaveRequest.find({
            staff: staffUser._id,
            status: 'Approved',
            startDate: { $lte: cycleEnd },
            endDate: { $gte: cycleStart }
        }).lean()
    ]);

    const attMap = {};
    attendance.forEach(a => { attMap[a.date] = a; });

    const isLeave = (dStr) => {
        return allApprovedLeaves.some(l => dStr >= l.startDate && dStr <= l.endDate);
    };

    let totalDaysInCycle = 0;
    let presentDays = 0;
    let halfDays = 0;
    let approvedLeaveDays = 0;
    let unapprovedAbsences = 0;
    let paidSundays = 0;
    let unpaidSundays = 0;
    let totalWorkingDaysRequired = 0;

    const fullCycleAttendance = [];
    const sundays = [];

    let d = csDate;
    while (d <= ceDate) {
        const dStr = d.toFormat('yyyy-MM-dd');
        totalDaysInCycle++;
        const isPastOrToday = dStr <= today;
        const isSunday = d.weekday === 7;
        const exist = attMap[dStr];
        const onApprovedLeave = isLeave(dStr);

        let status = 'absent';
        if (exist) {
            status = exist.status;
            if (status === 'present') presentDays++;
            else if (status === 'half-day') {
                halfDays++;
                presentDays += 0.5;
            }
        } else if (onApprovedLeave) {
            status = 'leave';
            approvedLeaveDays++;
        } else if (isPastOrToday && !isSunday) {
            unapprovedAbsences++;
        }

        if (isSunday) {
            sundays.push({ date: dStr, earned: false });
        } else {
            totalWorkingDaysRequired++;
        }

        fullCycleAttendance.push({
            date: dStr,
            day: d.day,
            status: exist ? exist.status : (onApprovedLeave ? 'leave' : (isPastOrToday ? 'absent' : 'upcoming')),
            isSunday,
            punchIn: exist?.punchIn,
            punchOut: exist?.punchOut,
            _id: exist?._id || `empty-${dStr}`
        });

        d = d.plus({ days: 1 });
    }

    // ── SUNDAY BENEFIT LOGIC ──
    // A Sunday is paid if the staff member had NO unapproved absences in the working week (Mon-Sat)
    // that contains this Sunday. 
    sundays.forEach(sun => {
        const sunDT = DateTime.fromISO(sun.date);
        const weekStart = sunDT.minus({ days: 6 }).toFormat('yyyy-MM-dd');
        const weekEnd = sunDT.minus({ days: 1 }).toFormat('yyyy-MM-dd'); // Mon to Sat

        // Check for any unapproved absence in this specific window
        let weekAbsence = false;
        let checkD = sunDT.minus({ days: 6 });
        while (checkD < sunDT) {
            const checkDStr = checkD.toFormat('yyyy-MM-dd');
            // Only count as absence if it's in the CURRENT cycle and is unapproved
            if (checkDStr >= cycleStart && checkDStr <= cycleEnd) {
                const dayAtt = attMap[checkDStr];
                const dayLeave = isLeave(checkDStr);
                if (!dayAtt && !dayLeave && checkDStr <= today) {
                    weekAbsence = true;
                    break;
                }
            }
            checkD = checkD.plus({ days: 1 });
        }

        if (!weekAbsence) {
            paidSundays++;
            sun.earned = true;
        } else {
            unpaidSundays++;
            sun.earned = false;
        }
    });

    const baseSalary = staffUser.salary || 0;
    // Salary = (Present + Approved Leaves + Earned Sundays) / Total Days in Month * Monthly Base
    const earnedDays = presentDays + approvedLeaveDays + paidSundays;
    const finalSalary = (earnedDays / totalDaysInCycle) * baseSalary;

    return {
        cycleStart,
        cycleEnd,
        totalDaysInCycle,
        presentDays,
        halfDays,
        approvedLeaveDays,
        unapprovedAbsences,
        paidSundays,
        unpaidSundays,
        earnedDays,
        baseSalary,
        finalSalary: Math.round(finalSalary),
        perDaySalary: Math.round(baseSalary / totalDaysInCycle),
        attendanceData: fullCycleAttendance,
        sundaysReport: sundays
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

// @desc    Update Staff Password
// @route   PUT /api/staff/update-password
// @access  Private/Staff
const updatePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid current password' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
});

module.exports = {
    staffPunchIn,
    staffPunchOut,
    getStaffStatus,
    getStaffHistory,
    requestLeave,
    getStaffLeaves,
    getStaffReport,
    getStaffSalaryCycles,
    updatePassword
};
