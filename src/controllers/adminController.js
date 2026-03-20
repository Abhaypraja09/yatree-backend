const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Company = require('../models/Company');
const Attendance = require('../models/Attendance');
const BorderTax = require('../models/BorderTax');
const Maintenance = require('../models/Maintenance');
const Fuel = require('../models/Fuel');
const Advance = require('../models/Advance');
const Parking = require('../models/Parking');
const StaffAttendance = require('../models/StaffAttendance');
const AccidentLog = require('../models/AccidentLog');
const PartsWarranty = require('../models/PartsWarranty');
const LeaveRequest = require('../models/LeaveRequest');
const Event = require('../models/Event');
const { DateTime } = require('luxon');
const asyncHandler = require('express-async-handler');

console.log('--- ADMIN CONTROLLER LOADED (V1.1) ---');
/* --- PERFORMANCE CACHE --- */
const DASHBOARD_CACHE = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 mins cache for heavy financial stats

// @desc    Create a new driver
// @route   POST /api/admin/drivers
// @access  Private/Admin
// @access  Private/Admin
const createDriver = async (req, res, next) => {
    try {
        const { name, mobile, password, companyId, isFreelancer, licenseNumber, username, dailyWage, salary, nightStayBonus, sameDayReturnBonus } = req.body;
        console.log('CREATE DRIVER BODY:', req.body);
        const freelancer = isFreelancer === 'true' || isFreelancer === true;

        if (!name || !mobile || (!freelancer && !password) || !companyId || companyId === 'undefined') {
            return res.status(400).json({ message: 'Please provide all required fields: name, mobile, password (for regular drivers), companyId' });
        }

        let userExists = null;
        if (freelancer) {
            // Freelancers don't conflict with Company/Staff on mobile, but shouldn't conflict with another freelancer perhaps?
            // Actually, we can allow freelancers to share the same mobile if they are just dummy entries.
            // But let's check username only if provided.
            if (username) {
                userExists = await User.findOne({ username });
            }
        } else {
            // Company drivers must not share a mobile/username with other company drivers, staff, executives, or admins.
            // They CAN share with a Freelancer.
            userExists = await User.findOne({
                $or: [
                    { mobile, isFreelancer: { $ne: true } },
                    ...(username ? [{ username }] : [])
                ]
            });
        }

        if (userExists) {
            const field = userExists.mobile === mobile ? 'mobile number' : 'username';
            const roleStr = userExists.role + (userExists.isFreelancer ? ' (Freelancer)' : '');
            return res.status(400).json({ message: `A ${roleStr} already exists with this ${field} (${userExists.name})` });
        }

        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(400).json({ message: 'Invalid company selected' });
        }

        const driver = new User({
            name,
            mobile,
            username,
            password,
            role: 'Driver',
            company: companyId,
            isFreelancer: isFreelancer === 'true' || isFreelancer === true,
            licenseNumber,
            dailyWage: Number(dailyWage) || 0,
            salary: Number(salary) || 0,
            nightStayBonus: (nightStayBonus !== undefined && nightStayBonus !== '') ? Number(nightStayBonus) : 500,
            sameDayReturnBonus: (sameDayReturnBonus !== undefined && sameDayReturnBonus !== '') ? Number(sameDayReturnBonus) : 100
        });

        if (req.files && req.files.drivingLicense) {
            driver.documents.push({
                documentType: 'Driving License',
                imageUrl: req.files.drivingLicense[0].path,
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year from now if not specified
                verificationStatus: 'Verified'
            });
        }

        const createdDriver = await driver.save();
        res.status(201).json({
            _id: createdDriver._id,
            name: createdDriver.name,
            mobile: createdDriver.mobile,
            company: createdDriver.company
        });
    } catch (error) {
        console.error('=== ERROR IN CREATE DRIVER ===', error);
        next(error);
    }
};

// @desc    Create a new vehicle
// @route   POST /api/admin/vehicles
// @access  Private/Admin
// @access  Private/Admin
const createVehicle = asyncHandler(async (req, res) => {
    console.log('CREATE VEHICLE REQUEST:', { body: req.body, files: req.files ? Object.keys(req.files) : 'no files' });
    const { carNumber, model, permitType, companyId, carType, isOutsideCar, dutyAmount, fastagNumber, fastagBalance, fastagBank, driverName, dutyType, dutyTime, ownerName, dropLocation, property, eventId } = req.body;

    const formattedCarNumber = carNumber.trim().toUpperCase();
    const vehicleExists = await Vehicle.findOne({ carNumber: formattedCarNumber });
    if (vehicleExists) {
        return res.status(400).json({ message: 'Vehicle already exists with this car number' });
    }

    const documents = [];
    const docTypes = ['rc', 'insurance', 'puc', 'fitness', 'permit'];

    docTypes.forEach(type => {
        if (req.files && req.files[type]) {
            documents.push({
                documentType: type.toUpperCase(),
                imageUrl: req.files[type][0].path,
                expiryDate: req.body[`expiry_${type}`] ? new Date(req.body[`expiry_${type}`]) : undefined
            });
        }
    });

    const vehicle = new Vehicle({
        carNumber: formattedCarNumber,
        model: model || (isOutsideCar ? 'Outside Car' : undefined),
        permitType: permitType || (isOutsideCar ? 'None/Outside' : undefined),
        company: companyId,
        carType: carType || 'SUV',
        isOutsideCar: isOutsideCar === 'true' || isOutsideCar === true,
        dutyAmount: Number(dutyAmount) || 0,
        fastagNumber,
        fastagBalance: Number(fastagBalance) || 0,
        fastagBank,
        driverName,
        dutyType,
        dutyTime,
        ownerName,
        dropLocation,
        property,
        transactionType: req.body.transactionType || 'Duty',
        vehicleSource: req.body.vehicleSource || (isOutsideCar === 'true' || isOutsideCar === true ? 'External' : 'Fleet'),
        eventId: eventId && eventId !== 'undefined' ? eventId : undefined,
        documents
    });

    if (req.body.createdAt) {
        // If it's a date string like YYYY-MM-DD, add time to prevent shift
        const dateStr = req.body.createdAt.includes('T') ? req.body.createdAt : `${req.body.createdAt}T12:00:00Z`;
        vehicle.createdAt = new Date(dateStr);
    }

    await vehicle.save();

    if (vehicle) {
        res.status(201).json(vehicle);
    } else {
        res.status(400).json({ message: 'Invalid vehicle data' });
    }
});

// @desc    Assign vehicle to driver
// @route   POST /api/admin/assign
// @access  Private/Admin
// @access  Private/Admin
const assignVehicle = asyncHandler(async (req, res) => {
    const { driverId, vehicleId } = req.body;

    const driver = await User.findById(driverId);
    const vehicle = await Vehicle.findById(vehicleId);

    if (!driver || !vehicle) {
        return res.status(404).json({ message: 'Driver or Vehicle not found' });
    }

    if (driver.company.toString() !== vehicle.company.toString()) {
        return res.status(400).json({ message: 'Driver and Vehicle must belong to the same company' });
    }

    // Clean up previous assignments if any
    if (driver.assignedVehicle) {
        await Vehicle.findByIdAndUpdate(driver.assignedVehicle, { currentDriver: null });
    }
    if (vehicle.currentDriver) {
        await User.findByIdAndUpdate(vehicle.currentDriver, { assignedVehicle: null });
    }

    driver.assignedVehicle = vehicleId;
    await driver.save();

    vehicle.currentDriver = driverId;
    await vehicle.save();

    res.json({ message: 'Vehicle assigned successfully', driver, vehicle });
});

// @desc    Block or Unblock driver
// @route   PATCH /api/admin/drivers/:id/status
// @access  Private/Admin
// @access  Private/Admin
const toggleDriverStatus = asyncHandler(async (req, res) => {
    const { status } = req.body; // 'active' or 'blocked'
    const driver = await User.findById(req.params.id);

    if (driver) {
        driver.status = status;
        await driver.save();
        res.json({ message: `Driver ${status} successfully` });
    } else {
        res.status(404).json({ message: 'Driver not found' });
    }
});

const syncVehicleOdometer = async (vehicleId) => {
    if (!vehicleId) return;
    try {
        // Sort by date DESC first, then by punchOut time DESC
        const latestValidAttendance = await Attendance.findOne({
            vehicle: vehicleId,
            status: 'completed'
        }).sort({ date: -1, 'punchOut.time': -1 });

        let latestKm = 0;
        if (latestValidAttendance && latestValidAttendance.punchOut?.km) {
            latestKm = latestValidAttendance.punchOut.km;
        } else {
            // Find latest punchIn if no completed duties
            const latestPunchIn = await Attendance.findOne({
                vehicle: vehicleId
            }).sort({ date: -1, 'punchIn.time': -1 });

            if (latestPunchIn && latestPunchIn.punchIn?.km) {
                latestKm = latestPunchIn.punchIn.km;
            }
        }

        // Always update, even to 0 if no records found, to ensure consistency
        await Vehicle.findByIdAndUpdate(vehicleId, { lastOdometer: latestKm || 0 });
        console.log(`[SYNC_KM] Vehicle ${vehicleId} updated to ${latestKm} KM`);
    } catch (error) {
        console.error(`[SYNC_KM] Error for vehicle ${vehicleId}:`, error);
    }
};

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard/:companyId
// @access  Private/Admin
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { date, from, to, month: qMonth, year: qYear, bypassCache } = req.query; // Support single date OR date range

    const cacheKey = `${companyId}_${qMonth}_${qYear}_${date}_${from}_${to}`;
    if (!bypassCache && DASHBOARD_CACHE.has(cacheKey)) {
        const cached = DASHBOARD_CACHE.get(cacheKey);
        if (Date.now() - cached.time < CACHE_TTL) {
            return res.json(cached.data);
        }
    }

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({ message: 'Invalid Company ID' });
    }

    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    // Default to today IST if no date provided
    const todayIST = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');

    // Monthly mode: use month/year params. Range mode: use from/to. Single mode: use date param.
    const isMonthlyMode = !!(qMonth && qYear);
    const isRangeMode = !!(from && to) && !isMonthlyMode;

    const targetDate = isRangeMode ? to : (date || todayIST); // reference day = end of range or selected date
    const baseDate = DateTime.fromFormat(targetDate, 'yyyy-MM-dd').setZone('Asia/Kolkata').startOf('day');
    const alertThreshold = baseDate.plus({ days: 30 });

    let monthStart, monthEnd;
    if (isMonthlyMode) {
        const m = parseInt(qMonth);
        const y = parseInt(qYear);
        monthStart = DateTime.fromObject({ year: y, month: m, day: 1 }, { zone: 'Asia/Kolkata' }).startOf('month').toJSDate();
        monthEnd = DateTime.fromObject({ year: y, month: m, day: 1 }, { zone: 'Asia/Kolkata' }).endOf('month').toJSDate();
    } else if (isRangeMode) {
        monthStart = DateTime.fromISO(from, { zone: 'Asia/Kolkata' }).startOf('day').toJSDate();
        monthEnd = DateTime.fromISO(to, { zone: 'Asia/Kolkata' }).endOf('day').toJSDate();
    } else {
        monthStart = baseDate.startOf('month').toJSDate();
        monthEnd = baseDate.endOf('month').toJSDate();
    }
    const monthStartStr = isMonthlyMode
        ? DateTime.fromJSDate(monthStart).toFormat('yyyy-MM-dd')
        : (isRangeMode ? from : baseDate.startOf('month').toFormat('yyyy-MM-dd'));
    const monthEndStr = isMonthlyMode
        ? DateTime.fromJSDate(monthEnd).toFormat('yyyy-MM-dd')
        : (isRangeMode ? to : baseDate.endOf('month').toFormat('yyyy-MM-dd'));

    const isTodaySelected = targetDate === todayIST;

    const yStart = DateTime.fromObject({ year: parseInt(qYear || baseDate.year), month: 1, day: 1 }, { zone: 'Asia/Kolkata' }).startOf('year').toJSDate();
    const yEnd = DateTime.fromObject({ year: parseInt(qYear || baseDate.year), month: 1, day: 1 }, { zone: 'Asia/Kolkata' }).endOf('year').toJSDate();

    // Run independent heavy queries concurrently with optimization (.lean & selective projection)
    const [
        totalVehicles,
        totalDrivers,
        attendanceToday,
        pendingApprovalsCount,
        vehiclesWithExpiringDocs,
        driversWithExpiringDocs,
        fastagData,
        advanceData, // For non-freelancer advances (total pending)
        monthlyFuelData,
        monthlyMaintenanceData,
        upcomingServices,
        totalStaff,
        staffAttendanceToday, // Staff attendance for today
        freelancerAdvanceData, // For freelancer advances (total and count)
        dailyAdvanceData, // For advances given today
        monthlyParkingData,
        allAttendanceThisMonth, // All attendance for the month
        monthlyBorderTaxData,
        regularAdvancesList, // Specific pending advances for regular drivers
        reportedIssuesList, // Reported issues from attendance,
        outsideCarsToday, // Outside cars logged as vehicles for today,
        monthlyAccidentData, // Monthly accident cost
        totalWarrantyData, // Total warranty cost
        outsideCarsThisMonth, // Outside cars for the entire month
        eventsThisMonth,
        allDrivers,
        allVehicles,
        fuelEntriesToday,
        dailyFastagData,
        yearlyAccidentData
    ] = await Promise.all([
        Vehicle.countDocuments({
            company: companyObjectId,
            isOutsideCar: { $ne: true }
        }),
        User.countDocuments({
            company: companyObjectId,
            role: 'Driver',
            isFreelancer: { $ne: true }
        }),
        Attendance.find({
            company: companyObjectId,
            date: targetDate
        })
            .populate({
                path: 'driver',
                select: 'name mobile isFreelancer salary dailyWage'
            })
            .populate('vehicle', 'carNumber')
            .lean(),
        User.countDocuments({
            company: companyObjectId,
            role: 'Driver',
            tripStatus: 'pending_approval'
        }),
        Vehicle.find({
            company: companyObjectId,
            isOutsideCar: { $ne: true },
            'documents.expiryDate': { $lte: alertThreshold.toJSDate() }
        }).select('carNumber documents').lean(),
        User.find({
            company: companyObjectId,
            role: 'Driver',
            'documents.expiryDate': { $lte: alertThreshold.toJSDate() }
        }).select('name documents').lean(),
        // Fastag Recharge this month instead of total balance (User request 01st March = 0)
        Vehicle.aggregate([
            { $match: { company: companyObjectId, fastagHistory: { $exists: true, $type: 'array' } } },
            { $unwind: '$fastagHistory' },
            {
                $match: {
                    'fastagHistory.date': { $gte: monthStart, $lte: monthEnd }
                }
            },
            { $group: { _id: null, total: { $sum: '$fastagHistory.amount' } } }
        ]).allowDiskUse(true),
        // Advances given this month instead of total pending (User request 01st March = 0)
        Advance.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'driver',
                    foreignField: '_id',
                    as: 'driverInfo'
                }
            },
            { $unwind: { path: '$driverInfo', preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    company: companyObjectId,
                    'driverInfo.isFreelancer': { $ne: true },
                    date: { $gte: monthStart, $lte: monthEnd },
                    remark: { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Fuel.aggregate([
            {
                $match: {
                    company: companyObjectId,
                    date: { $gte: monthStart, $lte: monthEnd }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Maintenance.aggregate([
            {
                $match: {
                    company: companyObjectId,
                    billDate: { $gte: monthStart, $lte: monthEnd }
                }
            },
            {
                $project: {
                    amount: 1,
                    isDriverService: {
                        $or: [
                            { $regexMatch: { input: { $toLower: { $ifNull: ["$category", ""] } }, regex: /wash|puncture|puncher|tissue|water|cleaning|mask|sanitizer/ } },
                            { $regexMatch: { input: { $toLower: { $ifNull: ["$description", ""] } }, regex: /wash|puncture|puncher|tissue|water|cleaning|mask|sanitizer/ } },
                            { $regexMatch: { input: { $toLower: { $ifNull: ["$maintenanceType", ""] } }, regex: /wash|puncture|puncher|tissue|water|cleaning|mask|sanitizer/ } }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$isDriverService",
                    total: { $sum: "$amount" }
                }
            }
        ]),
        Maintenance.find({
            company: companyObjectId,
            status: 'Completed'
        }).populate('vehicle', 'carNumber lastOdometer').sort({ billDate: -1, createdAt: -1 }).lean(),
        User.countDocuments({ company: companyObjectId, role: 'Staff' }),
        StaffAttendance.find({
            company: companyObjectId,
            date: targetDate
        }).populate('staff', 'name mobile').lean(),
        Advance.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'driver',
                    foreignField: '_id',
                    as: 'driverInfo'
                }
            },
            { $unwind: { path: '$driverInfo', preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    company: companyObjectId,
                    'driverInfo.isFreelancer': true,
                    status: 'Pending',
                    remark: { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        Advance.aggregate([
            {
                $match: {
                    company: companyObjectId,
                    date: {
                        $gte: baseDate.toJSDate(),
                        $lte: baseDate.endOf('day').toJSDate()
                    },
                    remark: { $not: /Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Parking.aggregate([
            {
                $match: {
                    company: companyObjectId,
                    date: { $gte: monthStart, $lte: monthEnd }
                }
            },
            {
                $project: {
                    serviceType: 1,
                    amount: 1,
                    isDriverService: {
                        $or: [
                            { $regexMatch: { input: { $toLower: { $ifNull: ["$remark", ""] } }, regex: /wash|puncture|puncher|tissue|water|cleaning|mask|sanitizer/ } },
                            { $regexMatch: { input: { $toLower: { $ifNull: ["$notes", ""] } }, regex: /wash|puncture|puncher|tissue|water|cleaning|mask|sanitizer/ } }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: { type: "$serviceType", isService: "$isDriverService" },
                    total: { $sum: "$amount" }
                }
            }
        ]),
        Attendance.find({
            company: companyObjectId,
            date: { $gte: monthStartStr, $lte: monthEndStr }
        }).populate('driver', 'name mobile salary dailyWage isFreelancer').populate('vehicle', 'carNumber model').lean(),
        BorderTax.aggregate([
            {
                $match: {
                    company: companyObjectId,
                    date: { $gte: monthStart, $lte: monthEnd }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Advance.find({
            company: companyObjectId,
            status: 'Pending',
            remark: { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ }
        }).populate({
            path: 'driver',
            match: { isFreelancer: { $ne: true } },
            select: 'name mobile'
        }).sort({ date: -1 }).lean(),
        Attendance.find({
            company: companyObjectId,
            'punchOut.otherRemarks': { $exists: true, $ne: '' }
        }).populate('driver', 'name').populate('vehicle', 'carNumber').sort({ createdAt: -1 }).limit(10).lean(),
        Vehicle.find({
            company: companyObjectId,
            isOutsideCar: true,
            createdAt: { $gte: baseDate.toJSDate(), $lte: baseDate.endOf('day').toJSDate() }
        }).lean(),
        AccidentLog.aggregate([
            {
                $match: {
                    company: companyObjectId,
                    date: { $gte: monthStart, $lte: monthEnd }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        PartsWarranty.aggregate([
            { $match: { company: companyObjectId } },
            { $group: { _id: null, total: { $sum: '$cost' } } }
        ]),
        Vehicle.find({
            company: companyObjectId,
            isOutsideCar: true
        }).sort({ createdAt: -1 }).limit(5000).lean(),
        Event.find({
            company: companyObjectId,
            date: { $gte: monthStart, $lte: monthEnd }
        }).lean(),
        User.find({ company: companyObjectId, role: 'Driver' }).select('name mobile isFreelancer tripStatus assignedVehicle').lean(),
        Vehicle.find({ company: companyObjectId, isOutsideCar: { $ne: true } }).select('carNumber model currentDriver lastOdometer').lean(),
        Fuel.find({
            company: companyObjectId,
            date: { $gte: baseDate.toJSDate(), $lte: baseDate.endOf('day').toJSDate() }
        }).select('amount fuelType quantity odometer stationName paymentMode paymentSource driver vehicle attendance date source createdAt').populate('vehicle', 'carNumber model').lean(),
        Vehicle.aggregate([
            { $match: { company: companyObjectId, fastagHistory: { $exists: true, $type: 'array' } } },
            { $unwind: '$fastagHistory' },
            {
                $match: {
                    'fastagHistory.date': {
                        $gte: baseDate.toJSDate(),
                        $lte: baseDate.endOf('day').toJSDate()
                    }
                }
            },
            { $group: { _id: null, total: { $sum: '$fastagHistory.amount' } } }
        ]),
        AccidentLog.aggregate([
            {
                $match: {
                    company: companyObjectId,
                    date: { $gte: yStart, $lte: yEnd }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
    ]);



    // OPTIMIZATION: Create Maps for O(1) lookups instead of .filter in loops
    const attendanceByDriverMap = new Map();
    const attendanceByVehicleMap = new Map();

    attendanceToday.forEach(att => {
        const dId = att.driver?._id ? att.driver._id.toString() : (att.driver?.toString() || null);
        const vId = att.vehicle?._id ? att.vehicle._id.toString() : (att.vehicle?.toString() || null);

        if (dId) {
            if (!attendanceByDriverMap.has(dId)) attendanceByDriverMap.set(dId, []);
            attendanceByDriverMap.get(dId).push(att);
        }
        if (vId) {
            if (!attendanceByVehicleMap.has(vId)) attendanceByVehicleMap.set(vId, []);
            attendanceByVehicleMap.get(vId).push(att);
        }
    });

    const fuelEntriesByDriverNameMap = new Map();
    const fuelEntriesByVehicleIdMap = new Map();

    fuelEntriesToday.forEach(f => {
        if (f.driver) {
            // Find by name for drivers
            if (!fuelEntriesByDriverNameMap.has(f.driver)) fuelEntriesByDriverNameMap.set(f.driver, []);
            fuelEntriesByDriverNameMap.get(f.driver).push(f);
        }
        if (f.vehicle) {
            const vIdStr = f.vehicle._id ? f.vehicle._id.toString() : f.vehicle.toString();
            if (!fuelEntriesByVehicleIdMap.has(vIdStr)) fuelEntriesByVehicleIdMap.set(vIdStr, []);
            fuelEntriesByVehicleIdMap.get(vIdStr).push(f);
        }
    });

    // Map all drivers using Optimized Maps
    const liveDriversFeed = allDrivers.map(driver => {
        const isF = driver.isFreelancer === true;
        const driverAttendances = attendanceByDriverMap.get(driver._id.toString()) || [];

        let fuelAmount = 0;
        let fuelEntries = [];
        // Daily Feed fuel comes primarily from the Fuel collection for that date
        // Note: For freelancers, `driver` might be stored as string Name instead of ObjectId. We check both maps.
        const standaloneFuelList = Array.from(fuelEntriesToday).filter(f =>
            (f.driver && f.driver.toString() === driver._id.toString()) ||
            (f.driver && f.driver === driver.name)
        );

        standaloneFuelList.forEach(f => {
            fuelAmount += (Number(f.amount) || 0);
            fuelEntries.push(f);
        });

        // Fallback for manual duties that didn't have a standalone record (only if attendance date matches)
        driverAttendances.forEach((att) => {
            if (att.date === targetDate && att.fuel?.amount > 0) {
                // If there's no fuel entry in the map for this amount on this day, add it
                const match = standaloneFuelList.find(f => f.amount === att.fuel.amount);
                if (!match) {
                    fuelAmount += (Number(att.fuel.amount) || 0);
                    fuelEntries.push({ amount: att.fuel.amount, fuelType: 'Duty Fuel', _id: `duty-${att._id}` });
                }
            }
        });

        let currentStatus = 'Absent';
        if (driverAttendances.length > 0) {
            const hasOngoing = driverAttendances.some(a => a.status === 'incomplete');
            if (hasOngoing) {
                currentStatus = 'Present';
            } else {
                currentStatus = 'Completed';
            }
        }

        return {
            _id: driver._id.toString(),
            name: driver.name,
            mobile: driver.mobile,
            isFreelancer: isF,
            status: currentStatus,
            tripStatus: driver.tripStatus,
            attendances: driverAttendances,
            currentAttendance: driverAttendances[driverAttendances.length - 1] || null,
            assignedVehicle: driver.assignedVehicle,
            fuelAmount,
            fuelEntries
        };
    }).filter(driver => {
        if (driver.isFreelancer) {
            // Freelancers: show if Present/Completed OR if they have fuel today 
            // OR if they are currently active/on-duty (to avoid disappearing from view)
            return driver.status !== 'Absent' || driver.fuelAmount > 0 || driver.tripStatus === 'active' || driver.assignedVehicle;
        } else {
            // Company drivers: Always show in live feed, even if they haven't punched in yet (Absent)
            return true;
        }
    });

    // Fetch any outside vehicle that has duty or fuel today to include in FLEET Feed
    const activeVehicleIdsFromLog = new Set([
        ...attendanceToday.map(a => a.vehicle?._id ? a.vehicle._id.toString() : a.vehicle?.toString()).filter(Boolean),
        ...fuelEntriesToday.map(f => f.vehicle?._id ? f.vehicle._id.toString() : f.vehicle?.toString()).filter(Boolean)
    ]);

    const activeOutsideVehicles = await Vehicle.find({
        _id: {
            $in: Array.from(activeVehicleIdsFromLog).map(id => {
                try { return new mongoose.Types.ObjectId(id); } catch (e) { return null; }
            }).filter(Boolean)
        },
        isOutsideCar: true
    }).select('carNumber model currentDriver lastOdometer isOutsideCar').lean();

    const feedVehiclesList = [...allVehicles, ...activeOutsideVehicles];

    const liveVehiclesFeed = feedVehiclesList.map(vehicle => {
        const vehicleIdStr = vehicle._id.toString();
        const vehicleAttendances = attendanceByVehicleMap.get(vehicleIdStr) || [];

        let status = 'Idle';
        let currentAttendance = null;

        const activeAtt = vehicleAttendances.find(a => a.status === 'incomplete');
        if (activeAtt) {
            status = 'In Use';
            currentAttendance = activeAtt;
        } else if (vehicleAttendances.length > 0) {
            status = 'Completed';
            currentAttendance = vehicleAttendances[0];
        }

        let fuelAmount = 0;
        let fuelEntries = [];
        const standaloneFuelForVehicle = fuelEntriesByVehicleIdMap.get(vehicleIdStr) || [];
        standaloneFuelForVehicle.forEach(f => {
            fuelAmount += (Number(f.amount) || 0);
            fuelEntries.push(f);
        });

        // Fallback for manual duties that didn't have a standalone record (only if attendance date matches)
        vehicleAttendances.forEach(a => {
            if (a.date === targetDate && a.fuel?.amount > 0) {
                const match = standaloneFuelForVehicle.find(f => f.amount === a.fuel.amount);
                if (!match) {
                    fuelAmount += (Number(a.fuel.amount) || 0);
                    fuelEntries.push({ amount: a.fuel.amount, fuelType: 'Duty Fuel', _id: `duty-${a._id}` });
                }
            }
        });

        return {
            _id: vehicle._id,
            carNumber: vehicle.carNumber,
            model: vehicle.model,
            status,
            attendances: vehicleAttendances,
            currentDriver: currentAttendance?.driver || null,
            fuelAmount,
            fuelEntries,
            date: targetDate
        };
    });

    const expiringAlerts = [];
    const buildExpiringAlerts = (list, type) => {
        list.forEach(v => {
            if (!v.documents) return;
            v.documents.forEach(doc => {
                if (doc.expiryDate) {
                    const expiry = DateTime.fromJSDate(doc.expiryDate).setZone('Asia/Kolkata').startOf('day');
                    if (expiry <= alertThreshold) {
                        const diffDays = Math.ceil(expiry.diff(baseDate, 'days').days);
                        const docName = (doc.documentType || 'Document').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                        expiringAlerts.push({
                            type, identifier: v.carNumber || v.name, documentType: docName,
                            expiryDate: doc.expiryDate, daysLeft: diffDays, status: diffDays < 0 ? 'Expired' : 'Expiring Soon'
                        });
                    }
                }
            });
        });
    };
    buildExpiringAlerts(vehiclesWithExpiringDocs, 'Vehicle');
    buildExpiringAlerts(driversWithExpiringDocs, 'Driver');

    const maintenanceAlertsSet = new Set();
    upcomingServices.forEach(s => {
        if (!s.vehicle) return;

        const types = (s.maintenanceType || 'General').split(', ').map(t => t.trim()).filter(Boolean);
        let isLatestForAnyType = false;

        types.forEach(t => {
            const trackerKey = `${s.vehicle._id.toString()}_${t}`;
            if (!maintenanceAlertsSet.has(trackerKey)) {
                maintenanceAlertsSet.add(trackerKey);
                isLatestForAnyType = true;
            }
        });

        // Skip if this record isn't the latest for any of its categories
        if (!isLatestForAnyType) return;

        const category = s.category || s.maintenanceType || 'General';

        if (s.nextServiceDate) {
            const serviceDate = DateTime.fromJSDate(s.nextServiceDate).setZone('Asia/Kolkata').startOf('day');
            const diffDays = Math.ceil(serviceDate.diff(baseDate, 'days').days);
            if (diffDays <= 30 && diffDays > -365) {
                const isOverdue = diffDays < 0;
                expiringAlerts.push({
                    type: 'Service',
                    identifier: s.vehicle.carNumber || 'N/A',
                    documentType: `${category.split(',')[0]} Service`,
                    expiryDate: s.nextServiceDate,
                    daysLeft: diffDays,
                    status: isOverdue ? 'Overdue' : 'Due Soon'
                });
            }
        }

        if (s.nextServiceKm && s.nextServiceKm > 0) {
            const currentKm = s.vehicle.lastOdometer || 0;
            const kmRemaining = s.nextServiceKm - currentKm;

            if (kmRemaining <= 500 && kmRemaining > -50000) {
                const isOverdue = kmRemaining <= 0;
                const taskLabel = (category.split(',')[0] || 'Maintenance').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

                expiringAlerts.push({
                    type: 'Service',
                    identifier: s.vehicle.carNumber,
                    documentType: `${taskLabel} Service`,
                    expiryDate: null,
                    daysLeft: kmRemaining,
                    status: isOverdue ? 'Urgent: Overdue' : 'Service Due',
                    currentKm,
                    targetKm: s.nextServiceKm
                });
            }
        }
    });

    const uniqueDriversToday = new Set(attendanceToday.filter(a => a.punchIn?.time).map(a => a.driver?._id?.toString()).filter(id => id));
    const punchOutCount = attendanceToday.filter(a => a.punchOut?.time).length;

    const workedDriversMap = new Map();
    const freelancerWorkedDriversMap = new Map();

    attendanceToday.forEach(att => {
        if (att.driver) {
            const driverId = att.driver._id ? att.driver._id.toString() : att.driver.toString();
            const wage = (Number(att.dailyWage) || 0) || (att.driver.dailyWage ? Number(att.driver.dailyWage) : 0) || (att.driver.salary ? Number(att.driver.salary) : 0) || 500;
            const sameDayReturn = Number(att.punchOut?.allowanceTA) || 0;
            const nightStay = Number(att.punchOut?.nightStayAmount) || 0;
            const bonuses = Math.max(sameDayReturn + nightStay, Number(att.outsideTrip?.bonusAmount) || 0);

            if (att.driver.isFreelancer === true || att.isFreelancer === true) {
                if (!freelancerWorkedDriversMap.has(driverId)) freelancerWorkedDriversMap.set(driverId, wage + bonuses);
            } else {
                if (!workedDriversMap.has(driverId)) workedDriversMap.set(driverId, wage + bonuses);
            }
        }
    });


    const dailyOutsideCarsTotal = outsideCarsThisMonth
        .filter(v => {
            const dutyDate = v.carNumber?.split('#')[1];
            // Mirror OutsideCars.jsx: (v.transactionType || 'Buy') === 'Buy'
            const isPayout = (v.transactionType || 'Buy') === 'Buy';
            const isEvent = v.eventId;
            return dutyDate === targetDate && !isEvent && isPayout;
        })
        .reduce((sum, v) => sum + Number(v.dutyAmount || 0), 0);

    const dailyEventTotal = outsideCarsThisMonth
        .filter(v => {
            const dutyDate = v.carNumber?.split('#')[1];
            // Mirror EventManagement.jsx: Sum dutyAmount for anything with eventId
            return dutyDate === targetDate && v.eventId;
        })
        .reduce((sum, v) => sum + Number(v.dutyAmount || 0), 0);

    const dailySalaryTotal = Array.from(workedDriversMap.values()).reduce((sum, val) => sum + Number(val || 0), 0);
    const dailyFreelancerSalaryTotal = Array.from(freelancerWorkedDriversMap.values()).reduce((sum, val) => sum + Number(val || 0), 0);

    const monthlyWorkedDrivers = new Map();
    const monthlyFreelancerWorkedDrivers = new Map();

    allAttendanceThisMonth.forEach(att => {
        if (!att.driver) return;
        const driverId = att.driver._id.toString();
        const key = `${driverId}_${att.date}`;
        const sameDayReturn = Number(att.punchOut?.allowanceTA) || 0;
        const nightStay = Number(att.punchOut?.nightStayAmount) || 0;
        const bonuses = Math.max(sameDayReturn + nightStay, Number(att.outsideTrip?.bonusAmount) || 0);

        if (att.driver.isFreelancer !== true && att.isFreelancer !== true) {
            const wage = (Number(att.dailyWage) || 0) || (att.driver.dailyWage ? Number(att.driver.dailyWage) : 0) || (att.driver.salary ? Math.round(Number(att.driver.salary) / 26) : 0) || 500;
            monthlyWorkedDrivers.set(key, (monthlyWorkedDrivers.get(key) || wage) + bonuses);
        } else {
            const wage = (Number(att.dailyWage) || 0) || (att.driver.dailyWage ? Number(att.driver.dailyWage) : 0) || 500;
            if (!monthlyFreelancerWorkedDrivers.has(key)) monthlyFreelancerWorkedDrivers.set(key, wage + bonuses);
        }
    });

    // Extract month and year from qMonth/qYear or baseDate
    const targetMonthStr = isMonthlyMode ? qMonth.padStart(2, '0') : baseDate.toFormat('MM');
    const targetYearStr = isMonthlyMode ? qYear : baseDate.toFormat('yyyy');
    const monthPrefix = `${targetYearStr}-${targetMonthStr}`;


    const outsideCarsMonthlyTotal = outsideCarsThisMonth
        .filter(v => {
            const dutyDate = v.carNumber?.split('#')[1];
            const matchesMonth = dutyDate?.startsWith(monthPrefix);
            // Mirror OutsideCars.jsx: (v.transactionType || 'Buy') === 'Buy'
            const isPayout = (v.transactionType || 'Buy') === 'Buy';
            const isEvent = v.eventId;
            return matchesMonth && !isEvent && isPayout;
        })
        .reduce((sum, v) => sum + (Number(v.dutyAmount) || 0), 0);

    // Event Management (M) Box: Should match the "Total Revenue" on Event Management page
    // Sums all external duties (isOutsideCar) assigned to events as seen in Revenue box
    const monthlyEventTotal = outsideCarsThisMonth
        .filter(v => {
            const dutyDate = v.carNumber?.split('#')[1];
            const matchesMonth = dutyDate?.startsWith(monthPrefix);
            return matchesMonth && v.eventId;
        })
        .reduce((sum, v) => sum + (Number(v.dutyAmount) || 0), 0);

    // NEW LOGIC: Calculate monthlyRegularSalaryTotal using the exact same logic as Driver Salaries page
    const baseMonth = isMonthlyMode ? parseInt(qMonth) : baseDate.month;
    const baseYear = isMonthlyMode ? parseInt(qYear) : baseDate.year;
    let exactSalarySummaries = [];
    let exactFreelancerSummaries = [];
    try {
        [exactSalarySummaries, exactFreelancerSummaries] = await Promise.all([
            getDriverSalarySummaryInternal(companyId, baseMonth, baseYear, false),
            getDriverSalarySummaryInternal(companyId, baseMonth, baseYear, true)
        ]);
    } catch (err) {
        console.error('Failed to get exact salary summaries for Dashboard', err);
    }

    const monthlyRegularSalaryTotal = exactSalarySummaries.reduce((sum, s) => sum + (s.totalEarned || 0), 0);
    const monthlyRegularAdvanceTotal = exactSalarySummaries.reduce((sum, s) => sum + (s.totalAdvances || 0), 0);
    const monthlyNetSalaryTotal = exactSalarySummaries.reduce((sum, s) => sum + (s.netPayable || 0), 0);
    const monthlyFreelancerSalaryTotal = exactFreelancerSummaries.reduce((sum, s) => sum + (s.totalEarned || 0), 0);
    const monthlySalaryTotal = monthlyRegularSalaryTotal + outsideCarsMonthlyTotal;

    const driverIdsOnDuty = [...new Set(attendanceToday.map(a => a.driver?._id?.toString()).filter(id => id))];
    const pendingAdvances = await Advance.find({
        driver: { $in: driverIdsOnDuty.map(id => new mongoose.Types.ObjectId(id)) },
        status: 'Pending'
    }).lean();

    const pendingAdvancesMap = new Map();
    pendingAdvances.forEach(adv => {
        const dId = adv.driver.toString();
        pendingAdvancesMap.set(dId, (pendingAdvancesMap.get(dId) || 0) + adv.amount);
    });

    const attendanceWithAdvanceInfo = attendanceToday.map(attendance => ({
        ...attendance,
        driverPendingAdvance: pendingAdvancesMap.get(attendance.driver?._id?.toString()) || 0
    }));

    const monthlyFastagTotal = fastagData[0]?.total || 0;
    const dailyFastagTotal = dailyFastagData[0]?.total || 0;
    const totalFastagBalance = monthlyFastagTotal; // Backwards compatibility if needed
    const totalAdvancePending = advanceData[0]?.total || 0;
    const totalFreelancerAdvancePending = freelancerAdvanceData[0]?.total || 0;
    const monthlyFuelAmount = monthlyFuelData[0]?.total || 0;

    // Split Maintenance into General and Services
    let monthlyMaintenanceGeneral = 0;
    let monthlyDriverServicesAmount = 0;
    monthlyMaintenanceData.forEach(d => {
        if (d._id === true) monthlyDriverServicesAmount += d.total;
        else monthlyMaintenanceGeneral += d.total;
    });

    // Split Parking into Actual, Car Service Maintenance, and Car Service Driver Services
    let monthlyParkingActual = 0;
    let monthlyParkingCarServiceMaint = 0;
    let monthlyParkingCarServiceDriver = 0;

    monthlyParkingData.forEach(p => {
        if (p._id.type === 'car_service') {
            if (p._id.isService) monthlyParkingCarServiceDriver += p.total;
            else monthlyParkingCarServiceMaint += p.total;
        } else {
            monthlyParkingActual += (p.total || 0);
        }
    });

    // Add pending expenses from attendance to match Maintenance page logic
    let monthlyPendingMaint = 0;
    let monthlyPendingServices = 0;
    const serviceRegex = /wash|puncture|puncher|tissue|water|cleaning|mask|sanitizer/i;

    allAttendanceThisMonth.forEach(doc => {
        if (!doc.pendingExpenses) return;
        doc.pendingExpenses.forEach(exp => {
            if (exp.status === 'approved' || exp.status === 'deleted') return;
            if (exp.type === 'other' || exp.type === 'parking') {
                const category = exp.fuelType || (exp.type === 'parking' ? 'Car Wash' : 'Maintenance');
                const isService = serviceRegex.test(category) || serviceRegex.test(exp.remark || '');
                if (isService) monthlyPendingServices += (Number(exp.amount) || 0);
                else monthlyPendingMaint += (Number(exp.amount) || 0);
            }
        });
    });

    const monthlyMaintenanceAmount = monthlyMaintenanceGeneral + monthlyParkingCarServiceMaint + monthlyPendingMaint;
    monthlyDriverServicesAmount += (monthlyPendingServices + monthlyParkingCarServiceDriver);
    const monthlyParkingAmount = monthlyParkingActual;
    const monthlyBorderTaxAmount = monthlyBorderTaxData[0]?.total || 0;
    const monthlyAccidentAmount = monthlyAccidentData[0]?.total || 0;
    const yearlyAccidentAmount = yearlyAccidentData[0]?.total || 0;
    const totalWarrantyCost = totalWarrantyData[0]?.total || 0;

    const finalResponse = {
        date: targetDate, totalVehicles, totalDrivers: liveDriversFeed.length,
        countPunchIns: uniqueDriversToday.size, countPunchOuts: punchOutCount,
        activeDutiesCount: attendanceToday.filter(a => a.status === 'incomplete').length,
        pendingApprovalsCount, totalFastagBalance, monthlyFastagTotal, dailyFastagTotal, totalAdvancePending: monthlyRegularAdvanceTotal,
        monthlyFuelAmount, monthlyMaintenanceAmount, monthlyParkingAmount, monthlyDriverServicesAmount,
        monthlyBorderTaxAmount, monthlyAccidentAmount, yearlyAccidentAmount, totalWarrantyCost,
        totalExpenseAmount: monthlyFuelAmount + monthlyMaintenanceAmount + monthlyParkingAmount + monthlyBorderTaxAmount + monthlyAccidentAmount + totalWarrantyCost + monthlyDriverServicesAmount,
        totalStaff, countStaffPresent: staffAttendanceToday.length,
        staffAttendanceToday, attendanceDetails: attendanceWithAdvanceInfo,
        expiringAlerts, reportedIssues: reportedIssuesList,
        regularAdvances: regularAdvancesList.filter(adv => adv.driver),
        totalAdvancesSum: monthlyRegularAdvanceTotal + totalFreelancerAdvancePending,
        dailyAdvancesSum: dailySalaryTotal + (dailyAdvanceData[0]?.total || 0),
        dailySalaryTotal, dailyNightStayCount: attendanceToday.filter(att => Number(att.punchOut?.nightStayAmount) > 0).length,
        dailyFreelancerSalaryTotal, monthlySalaryTotal, monthlyRegularSalaryTotal, monthlyRegularAdvanceTotal, monthlyNetSalaryTotal, monthlyFreelancerSalaryTotal,
        monthlyOutsideCarsTotal: outsideCarsMonthlyTotal,
        dailyOutsideCarsTotal,
        monthlyEventTotal,
        ...(() => {
            let total = 0;
            let entities = new Set();
            let allEntries = [...fuelEntriesToday];

            fuelEntriesToday.forEach(f => {
                total += Number(f.amount) || 0;
                if (f.vehicle) entities.add("v_" + f.vehicle.toString());
                else if (f.driver) entities.add("d_" + f.driver.toString());
            });

            // Build lookup sets for deduplication
            // 1. Attendance IDs already referenced by a real Fuel record (driver-entered, linked via att ref)
            const fuelCoveredAttIds = new Set(
                fuelEntriesToday.filter(f => f.attendance).map(f => f.attendance.toString())
            );
            // 2. vehicle+amount combos already covered by real Fuel entries (admin-entered, no att ref)
            const fuelCoveredVehicleAmounts = new Set(
                fuelEntriesToday.map(f => {
                    const vId = f.vehicle?._id?.toString() || f.vehicle?.toString() || '';
                    return `${vId}_${f.amount}`;
                })
            );

            attendanceToday.forEach(att => {
                if (att.fuel?.amount > 0) {
                    const attIdStr = att._id?.toString() || '';
                    const vehicleIdStr = att.vehicle?._id?.toString() || att.vehicle?.toString() || '';
                    const combo = `${vehicleIdStr}_${att.fuel.amount}`;

                    // Skip if this attendance is already covered by a real Fuel record
                    if (fuelCoveredAttIds.has(attIdStr) || fuelCoveredVehicleAmounts.has(combo)) {
                        return; // already shown as a proper Fuel entry — don't duplicate
                    }

                    total += Number(att.fuel.amount);
                    if (att.vehicle?._id) entities.add("v_" + att.vehicle._id.toString());
                    else if (att.driver?._id) entities.add("d_" + att.driver._id.toString());

                    allEntries.push({
                        _id: `duty-${att._id}`,
                        amount: att.fuel.amount,
                        fuelType: 'Duty Fuel',
                        driver: att.driver?.name || 'Unknown',
                        vehicle: att.vehicle ? { _id: att.vehicle._id, carNumber: att.vehicle.carNumber } : null,
                        date: att.date,
                        paymentMode: 'N/A',
                        source: 'Duty App'
                    });
                }
            });
            return {
                dailyFuelAmount: { total, count: entities.size },
                dailyFuelEntries: allEntries
            };
        })(),
        freelancerAdvances: { total: totalFreelancerAdvancePending, count: freelancerAdvanceData[0]?.count || 0 },
        liveDriversFeed, liveVehiclesFeed, dailyAdvanceTotal: dailyAdvanceData[0]?.total || 0,
        dailyFastagTotal: dailyFastagData[0]?.total || 0,
        dutyHistoryThisMonth: allAttendanceThisMonth.sort((a, b) => new Date(b.date) - new Date(a.date))
    };

    if (req.user && req.user.role === 'Executive') {
        const p = req.user.permissions || {};

        // Remove Drivers Service data
        if (!p.driversService) {
            finalResponse.totalDrivers = 0;
            finalResponse.totalStaff = 0;
            finalResponse.countStaffPresent = 0;
            finalResponse.staffAttendanceToday = [];
            finalResponse.dailySalaryTotal = 0;
            finalResponse.dailyFreelancerSalaryTotal = 0;
            finalResponse.monthlySalaryTotal = 0;
            finalResponse.monthlyRegularSalaryTotal = 0;
            finalResponse.monthlyRegularAdvanceTotal = 0;
            finalResponse.monthlyNetSalaryTotal = 0;
            finalResponse.monthlyFreelancerSalaryTotal = 0;
            finalResponse.attendanceDetails = [];
            finalResponse.regularAdvances = [];
            finalResponse.totalAdvancesSum = finalResponse.totalAdvancesSum - (monthlyRegularAdvanceTotal + totalFreelancerAdvancePending);
            finalResponse.freelancerAdvances = { total: 0, count: 0 };
            finalResponse.expiringAlerts = finalResponse.expiringAlerts.filter(a => a.type !== 'Driver');
            finalResponse.dutyHistoryThisMonth = [];
            finalResponse.liveDriversFeed = [];
        }

        // Remove Buy/Sell data
        if (!p.buySell) {
            finalResponse.monthlyOutsideCarsTotal = 0;
            // Clean attendanceDetails of outside trip info if needed
        }

        // 3. Vehicles Maintenance
        if (!p.vehiclesManagement) {
            finalResponse.totalVehicles = 0;
            finalResponse.monthlyMaintenanceAmount = 0;
            finalResponse.monthlyAccidentAmount = 0;
            finalResponse.yearlyAccidentAmount = 0;
            finalResponse.totalWarrantyCost = 0;
            finalResponse.reportedIssues = [];
            finalResponse.liveVehiclesFeed = [];
            finalResponse.expiringAlerts = finalResponse.expiringAlerts.filter(a => a.type !== 'Service');
        }

        // 4. Fleet Operations
        if (!p.fleetOperations) {
            finalResponse.monthlyFuelAmount = 0;
            finalResponse.monthlyParkingAmount = 0;
            finalResponse.monthlyDriverServicesAmount = 0;
            finalResponse.monthlyBorderTaxAmount = 0;
            finalResponse.totalFastagBalance = 0;
            finalResponse.monthlyFastagTotal = 0;
            finalResponse.dailyFastagTotal = 0;
            finalResponse.dailyFuelAmount = { total: 0, count: 0 };
            finalResponse.dailyFuelEntries = [];
            finalResponse.expiringAlerts = finalResponse.expiringAlerts.filter(a => a.type !== 'Vehicle');
        }

        // Recalculate totalExpenseAmount based on allowed visibility
        const currentMaint = p.vehiclesManagement ? (finalResponse.monthlyMaintenanceAmount + finalResponse.monthlyAccidentAmount + finalResponse.totalWarrantyCost) : 0;
        const currentFleet = p.fleetOperations ? (finalResponse.monthlyFuelAmount + finalResponse.monthlyParkingAmount + finalResponse.monthlyBorderTaxAmount + finalResponse.monthlyDriverServicesAmount) : 0;

        finalResponse.totalExpenseAmount = currentMaint + currentFleet;
    }

    DASHBOARD_CACHE.set(cacheKey, { data: finalResponse, time: Date.now() });
    res.json(finalResponse);
});

// @desc    Get all drivers with pagination
// @route   GET /api/admin/drivers/:companyId
// @access  Private/Admin
// @access  Private/Admin
const getAllDrivers = asyncHandler(async (req, res) => {
    console.log('getAllDrivers request:', { params: req.params, query: req.query });
    const { companyId } = req.params;
    const isFreelancerQuery = req.query.isFreelancer === 'true';
    const usePagination = req.query.usePagination !== 'false';
    const pageSize = 10;
    const page = Number(req.query.pageNumber) || 1;

    try {
        const query = {
            $or: [
                { company: new mongoose.Types.ObjectId(companyId) },
                { company: companyId }
            ],
            role: 'Driver'
        };
        if (req.query.isFreelancer !== undefined) {
            query.isFreelancer = isFreelancerQuery;
        }

        // 1. Calculate Global Stats for the company
        const allDrivers = await User.find(query).select('_id status isFreelancer');
        const allDriverIds = allDrivers.map(d => d._id);
        const todayStr = new Date().toLocaleDateString('en-CA');

        const [activeAt, completedToday] = await Promise.all([
            Attendance.find({ driver: { $in: allDriverIds }, status: 'incomplete' }).populate('vehicle', 'carNumber model').select('driver vehicle'),
            Attendance.find({ driver: { $in: allDriverIds }, status: 'completed', date: todayStr }).select('driver')
        ]);

        const activeAtSet = new Set(activeAt.map(a => a.driver?.toString()));
        const completedAtSet = new Set(completedToday.map(a => a.driver?.toString()));

        const stats = {
            total: allDrivers.length,
            active: allDrivers.filter(d => d.status === 'active').length,
            blocked: allDrivers.filter(d => d.status === 'blocked').length,
            onDuty: activeAtSet.size,
            completedToday: completedAtSet.size
        };

        const fetchDriversList = async (q, paginated = true) => {
            let mongoQuery = User.find(q).populate('assignedVehicle', 'carNumber model');
            if (paginated) {
                mongoQuery = mongoQuery.limit(pageSize).skip(pageSize * (page - 1));
            }
            const drivers = await mongoQuery.sort({ createdAt: -1 });

            return drivers.map(d => {
                const driverObj = d.toObject();
                const dId = d._id.toString();

                if (activeAtSet.has(dId)) {
                    // Try to find the active attendance object if needed, or just set flag
                    driverObj.activeAttendance = activeAt.find(a => a.driver?.toString() === dId);
                }
                if (completedAtSet.has(dId)) {
                    driverObj.dutyCompletedToday = true;
                }
                return driverObj;
            });
        };

        if (!usePagination) {
            const drivers = await fetchDriversList(query, false);
            return res.json({ drivers, stats });
        }

        const count = await User.countDocuments(query);
        const driversList = await fetchDriversList(query, true);

        res.json({ drivers: driversList, page, pages: Math.ceil(count / pageSize), total: count, stats });
    } catch (error) {
        console.error('Error in getAllDrivers:', error);
        throw error;
    }
});

// @desc    Get all vehicles with pagination
// @route   GET /api/admin/vehicles/:companyId
// @access  Private/Admin
// @access  Private/Admin
const getAllVehicles = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const usePagination = req.query.usePagination !== 'false';
    const type = req.query.type;
    const pageSize = 10;
    const page = Number(req.query.pageNumber) || 1;
    const fetchVehiclesAndSync = async (query) => {
        const vehicles = await Vehicle.find(query)
            .populate('currentDriver', 'name mobile isFreelancer')
            .sort({ carNumber: 1 });

        // Sync orphans: find freelance drivers who are 'active' but their vehicle is not linked
        const onDutyFreelancers = await User.find({
            $or: [
                { company: new mongoose.Types.ObjectId(companyId) },
                { company: companyId }
            ],
            isFreelancer: true,
            tripStatus: 'active'
        });
        for (const drv of onDutyFreelancers) {
            const vIndex = vehicles.findIndex(v => v._id.toString() === drv.assignedVehicle?.toString());
            if (vIndex !== -1 && !vehicles[vIndex].currentDriver) {
                // Healing: Update DB and memory
                await Vehicle.findByIdAndUpdate(drv.assignedVehicle, { currentDriver: drv._id });
                // Re-fetch or manually update object for response
                const updatedV = await Vehicle.findById(drv.assignedVehicle).populate('currentDriver', 'name mobile isFreelancer');
                vehicles[vIndex] = updatedV;
            }
        }

        // Backward Healing: Clear currentDriver if driver is no longer active OR has no active attendance
        // IMPORTANT: Only heal if there's no incomplete attendance (to avoid race conditions right after punch-in)
        for (let i = 0; i < vehicles.length; i++) {
            const v = vehicles[i];
            if (v.currentDriver) {
                const drv = await User.findById(v.currentDriver);
                if (!drv) {
                    // Driver deleted — safe to clear
                    await Vehicle.findByIdAndUpdate(v._id, { currentDriver: null });
                    v.currentDriver = null;
                } else if (drv.tripStatus !== 'active') {
                    // Driver is not active — check for incomplete attendance before clearing
                    const hasActiveAttendance = await Attendance.findOne({
                        driver: drv._id,
                        vehicle: v._id,
                        status: 'incomplete'
                    });
                    if (!hasActiveAttendance) {
                        // Safe to clear — no active duty
                        await Vehicle.findByIdAndUpdate(v._id, { currentDriver: null });
                        v.currentDriver = null;
                    } else {
                        // Driver has an active attendance — fix tripStatus instead
                        await User.findByIdAndUpdate(drv._id, { tripStatus: 'active', assignedVehicle: v._id });
                    }
                } else if (drv.assignedVehicle?.toString() !== v._id.toString()) {
                    // Driver is 'active' but assigned to a different vehicle — check attendance
                    const hasActiveAttendance = await Attendance.findOne({
                        driver: drv._id,
                        vehicle: v._id,
                        status: 'incomplete'
                    });
                    if (!hasActiveAttendance) {
                        // No active duty on this vehicle — safe to clear
                        await Vehicle.findByIdAndUpdate(v._id, { currentDriver: null });
                        v.currentDriver = null;
                    }
                }
            }
        }
        return vehicles;
    };

    let query = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ]
    };
    if (type === 'outside') {
        query.isOutsideCar = true;
    } else if (type === 'fleet') {
        query.isOutsideCar = { $ne: true };
    } else if (type === 'all') {
        // No filter on isOutsideCar
    } else { // Default to fleet only for backward compatibility
        query.isOutsideCar = { $ne: true };
    }

    const { from, to } = req.query;
    if (from && to) {
        // For outside cars, filtering by createdAt usually means the duty date
        query.createdAt = {
            $gte: new Date(`${from}T00:00:00Z`),
            $lte: new Date(`${to}T23:59:59Z`)
        };
    }

    if (!usePagination) {
        const vehicles = await fetchVehiclesAndSync(query);
        return res.json({ vehicles });
    }

    const count = await Vehicle.countDocuments(query);
    const vehicles = await fetchVehiclesAndSync(query); // Using the same sync logic for paginated as well
    // Note: Applying sync to the whole list to ensure correctness

    res.json({ vehicles, page, pages: Math.ceil(count / pageSize), total: count });
});

// @desc    Update driver details
// @route   PUT /api/admin/drivers/:id
// @access  Private/Admin
// @access  Private/Admin
const updateDriver = asyncHandler(async (req, res) => {
    const driver = await User.findById(req.params.id);

    if (driver) {
        // Explicitly handle all fields
        if (req.body.name) driver.name = req.body.name;

        if (req.body.isFreelancer !== undefined) {
            driver.isFreelancer = req.body.isFreelancer === 'true' || req.body.isFreelancer === true;
        }

        if (req.body.mobile && req.body.mobile !== driver.mobile) {
            if (!driver.isFreelancer) {
                const mobileExists = await User.findOne({ mobile: req.body.mobile, isFreelancer: { $ne: true } });
                if (mobileExists) {
                    const roleStr = mobileExists.role + (mobileExists.isFreelancer ? ' (Freelancer)' : '');
                    return res.status(400).json({ message: `Mobile number already in use by a ${roleStr} (${mobileExists.name})` });
                }
            }
            driver.mobile = req.body.mobile;
        }

        if (req.body.username !== undefined && req.body.username !== driver.username) {
            if (req.body.username === "") {
                driver.username = undefined;
            } else {
                const usernameExists = await User.findOne({ username: req.body.username });
                if (usernameExists) return res.status(400).json({ message: 'Username already in use' });
                driver.username = req.body.username;
            }
        }

        if (req.body.password) {
            driver.password = req.body.password;
        }

        if (req.body.dailyWage !== undefined) {
            driver.dailyWage = Number(req.body.dailyWage);
        }

        if (req.body.salary !== undefined) {
            driver.salary = Number(req.body.salary);
        }


        if (req.body.nightStayBonus !== undefined && req.body.nightStayBonus !== '') {
            driver.nightStayBonus = Number(req.body.nightStayBonus);
        }

        if (req.body.sameDayReturnBonus !== undefined && req.body.sameDayReturnBonus !== '') {
            driver.sameDayReturnBonus = Number(req.body.sameDayReturnBonus);
        }

        if (req.body.licenseNumber !== undefined) {
            driver.licenseNumber = req.body.licenseNumber;
        }

        if (req.files && req.files.drivingLicense) {
            // Remove old Driving License if exists
            driver.documents = driver.documents.filter(doc => doc.documentType !== 'Driving License');
            driver.documents.push({
                documentType: 'Driving License',
                imageUrl: req.files.drivingLicense[0].path,
                expiryDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // Default 10 years for DL
                verificationStatus: 'Verified'
            });
        }

        console.log('UPDATING DRIVER:', {
            id: req.params.id,
            updates: {
                name: driver.name,
                mobile: driver.mobile,
                license: driver.licenseNumber,
                freelancer: driver.isFreelancer,
                nightStayBonus: driver.nightStayBonus,
                sameDayReturnBonus: driver.sameDayReturnBonus
            }
        });

        const updatedDriver = await driver.save();
        // Clear dashboard cache on mutation
        DASHBOARD_CACHE.clear();
        res.json({
            _id: updatedDriver._id,
            name: updatedDriver.name,
            mobile: updatedDriver.mobile,
            licenseNumber: updatedDriver.licenseNumber,
            company: updatedDriver.company
        });
    } else {
        res.status(404).json({ message: 'Driver not found' });
    }
});

// @desc    Update vehicle details
// @route   PUT /api/admin/vehicles/:id
// @access  Private/Admin
// @access  Private/Admin
const updateVehicle = asyncHandler(async (req, res) => {
    const vehicleId = req.params.id;
    console.log('UPDATE VEHICLE REQUEST:', { id: vehicleId, body: req.body, files: req.files ? Object.keys(req.files) : 'no files' });

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Build the update object
    const updateData = {};

    // Handle carNumber update with uniqueness check
    if (req.body.carNumber) {
        const newCarNumber = req.body.carNumber.trim().toUpperCase();
        // Only do uniqueness check if the number actually changed
        if (newCarNumber.toUpperCase() !== vehicle.carNumber.toUpperCase()) {
            const vehicleExists = await Vehicle.findOne({
                carNumber: { $regex: new RegExp(`^${newCarNumber}$`, 'i') },
                _id: { $ne: vehicle._id }
            });
            if (vehicleExists) {
                return res.status(400).json({ message: 'Another vehicle already exists with this car number' });
            }
        }
        updateData.carNumber = newCarNumber;
    }

    if (req.body.model) updateData.model = req.body.model;
    if (req.body.permitType) updateData.permitType = req.body.permitType;
    if (req.body.carType) updateData.carType = req.body.carType;
    if (req.body.status) updateData.status = req.body.status;

    if (req.body.isOutsideCar !== undefined) {
        updateData.isOutsideCar = req.body.isOutsideCar === 'true' || req.body.isOutsideCar === true;
    }
    if (req.body.driverName !== undefined) updateData.driverName = req.body.driverName;
    if (req.body.ownerName !== undefined) updateData.ownerName = req.body.ownerName;
    if (req.body.dutyAmount !== undefined) updateData.dutyAmount = Number(req.body.dutyAmount);
    if (req.body.dutyType !== undefined) updateData.dutyType = req.body.dutyType;
    if (req.body.dutyTime !== undefined) updateData.dutyTime = req.body.dutyTime;
    if (req.body.dropLocation !== undefined) updateData.dropLocation = req.body.dropLocation;
    if (req.body.property !== undefined) updateData.property = req.body.property;
    if (req.body.lastOdometer !== undefined) updateData.lastOdometer = Number(req.body.lastOdometer);
    if (req.body.fastagBalance !== undefined) updateData.fastagBalance = Number(req.body.fastagBalance);
    if (req.body.fastagNumber !== undefined) updateData.fastagNumber = req.body.fastagNumber;
    if (req.body.fastagBank !== undefined) updateData.fastagBank = req.body.fastagBank;
    if (req.body.transactionType !== undefined) updateData.transactionType = req.body.transactionType;
    if (req.body.vehicleSource !== undefined) updateData.vehicleSource = req.body.vehicleSource;
    if (req.body.eventId !== undefined) {
        updateData.eventId = req.body.eventId && req.body.eventId !== 'undefined' ? req.body.eventId : undefined;
    }

    if (req.body.createdAt) {
        const dateStr = req.body.createdAt.includes('T') ? req.body.createdAt : `${req.body.createdAt}T12:00:00Z`;
        updateData.createdAt = new Date(dateStr);
    }

    // Handle Document Updates if any files are uploaded
    let documentUpdates = [...vehicle.documents];
    if (req.files) {
        const docTypes = ['rc', 'insurance', 'puc', 'fitness', 'permit'];
        docTypes.forEach(type => {
            if (req.files[type]) {
                const upperType = type.toUpperCase();
                const expiry = req.body[`expiry_${type}`];
                // Remove old document of same type
                documentUpdates = documentUpdates.filter(d => d.documentType !== upperType);
                // Add new one
                documentUpdates.push({
                    documentType: upperType,
                    imageUrl: req.files[type][0].path,
                    expiryDate: expiry ? new Date(expiry) : new Date()
                });
            }
        });
        updateData.documents = documentUpdates;
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
        vehicleId,
        { $set: updateData },
        { new: true, runValidators: false }
    ).populate('currentDriver', 'name mobile');

    // Clear dashboard cache on mutation
    DASHBOARD_CACHE.clear();

    res.json(updatedVehicle);
});

// @desc    Delete driver
// @route   DELETE /api/admin/drivers/:id
// @access  Private/Admin
// @access  Private/Admin
const deleteDriver = asyncHandler(async (req, res) => {
    const driver = await User.findById(req.params.id);

    if (driver) {
        // Clear vehicle assignment
        if (driver.assignedVehicle) {
            await Vehicle.findByIdAndUpdate(driver.assignedVehicle, { currentDriver: null });
        }
        await User.deleteOne({ _id: driver._id });
        // Clear dashboard cache on mutation
        DASHBOARD_CACHE.clear();
        res.json({ message: 'Driver removed successfully' });
    } else {
        res.status(404).json({ message: 'Driver not found' });
    }
});

// @desc    Delete vehicle
// @route   DELETE /api/admin/vehicles/:id
// @access  Private/Admin
// @access  Private/Admin
const deleteAttendance = asyncHandler(async (req, res) => {
    const attendance = await Attendance.findById(req.params.id);

    if (attendance) {
        // Release vehicle if it was active
        if (attendance.status === 'incomplete' && attendance.vehicle) {
            await Vehicle.findByIdAndUpdate(attendance.vehicle, { currentDriver: null });
            await User.findByIdAndUpdate(attendance.driver, { tripStatus: 'approved' });
        }

        // 1. Delete linked parking entries (by direct link)
        await Parking.deleteMany({ attendanceId: attendance._id });

        // 2. Delete linked fuel entries (by direct link)
        await Fuel.deleteMany({ attendance: attendance._id });

        // 3. BROAD SWEEP (Deeper Deletion):
        // Deleting all related entries for the same driver, vehicle, and date to ensure clean state
        const targetDate = attendance.date; // format YYYY-MM-DD
        const startDay = new Date(`${targetDate}T00:00:00.000Z`);
        const endDay = new Date(`${targetDate}T23:59:59.999Z`);
        const vehicleId = attendance.vehicle;
        const driverId = attendance.driver;

        // Delete Parking by Date/Vehicle/Driver (for stray entries)
        await Parking.deleteMany({
            company: attendance.company,
            driverId: driverId,
            vehicle: vehicleId,
            date: { $gte: startDay, $lte: endDay }
        });

        // Delete Fuel by Date/Vehicle/Driver (for stray entries)
        await Fuel.deleteMany({
            company: attendance.company,
            vehicle: vehicleId,
            date: { $gte: startDay, $lte: endDay }
        });

        // Delete Advances for that driver on that day (common freelancers workflow)
        await Advance.deleteMany({
            company: attendance.company,
            driver: driverId,
            date: { $gte: startDay, $lte: endDay }
        });

        // Delete Border Tax for that day/vehicle
        await BorderTax.deleteMany({
            company: attendance.company,
            vehicle: vehicleId,
            date: targetDate
        });

        await Attendance.deleteOne({ _id: attendance._id });

        // Sync odometer if fleet vehicle
        if (vehicleId) {
            await syncVehicleOdometer(vehicleId);
        }

        // Clear dashboard cache on mutation
        DASHBOARD_CACHE.clear();

        res.json({ message: 'Attendance record deleted successfully' });
    } else {
        res.status(404).json({ message: 'Attendance record not found' });
    }
});

const deleteStaffAttendance = asyncHandler(async (req, res) => {
    const attendance = await StaffAttendance.findById(req.params.id);

    if (attendance) {
        await StaffAttendance.deleteOne({ _id: attendance._id });
        res.json({ message: 'Staff attendance record deleted successfully' });
    } else {
        res.status(404).json({ message: 'Attendance record not found' });
    }
});

const deleteVehicle = asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id);

    if (vehicle) {
        // Clear driver assignment
        if (vehicle.currentDriver) {
            await User.findByIdAndUpdate(vehicle.currentDriver, { assignedVehicle: null });
        }
        // If it's an outside car duty voucher, also clean up associated stray entries
        if (vehicle.isOutsideCar) {
            const dateSuffix = vehicle.carNumber?.split('#')?.[1]; // e.g., 2023-10-27
            if (dateSuffix) {
                const startDay = new Date(`${dateSuffix}T00:00:00.000Z`);
                const endDay = new Date(`${dateSuffix}T23:59:59.999Z`);
                
                await Parking.deleteMany({
                    company: vehicle.company,
                    vehicle: vehicle._id,
                    date: { $gte: startDay, $lte: endDay }
                });
                
                await Fuel.deleteMany({
                    company: vehicle.company,
                    vehicle: vehicle._id,
                    date: { $gte: startDay, $lte: endDay }
                });

                // Delete Border Tax
                await BorderTax.deleteMany({
                    company: vehicle.company,
                    vehicle: vehicle._id,
                    date: dateSuffix
                });
            }
        }

        await Vehicle.deleteOne({ _id: vehicle._id });
        // Clear dashboard cache on mutation
        DASHBOARD_CACHE.clear();
        res.json({ message: 'Vehicle removed successfully' });
    } else {
        res.status(404).json({ message: 'Vehicle not found' });
    }
});

// @desc    Upload vehicle document
// @route   POST /api/admin/vehicles/:id/documents
// @access  Private/Admin
// @access  Private/Admin
const uploadVehicleDocument = asyncHandler(async (req, res) => {
    const { documentType, expiryDate } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'Document file is required' });
    }

    // Remove old document of same type if exists
    vehicle.documents = vehicle.documents.filter(doc => doc.documentType !== documentType);

    vehicle.documents.push({
        documentType,
        imageUrl: req.file.path,
        expiryDate: (expiryDate && expiryDate !== 'undefined' && expiryDate !== '') ? new Date(expiryDate) : undefined
    });

    await vehicle.save();

    // Immediate Alert if expiring soon (within 30 days) disabled at user request
    /*
    try {
        const { DateTime } = require('luxon');
        const { sendSMS } = require('../utils/smsService');
        const User = require('../models/User');

        const now = DateTime.now().setZone('Asia/Kolkata').startOf('day');
        const expiry = DateTime.fromJSDate(new Date(expiryDate)).setZone('Asia/Kolkata').startOf('day');
        const daysLeft = Math.ceil(expiry.diff(now, 'days').days);

        if (daysLeft <= 30) {
            const admin = await User.findOne({ role: 'Admin' });
            if (admin && admin.mobile) {
                const message = `IMMEDIATE ALERT: Vehicle document for ${vehicle.carNumber} (${documentType}) is expiring on ${expiry.toFormat('dd-MM-yyyy')}. Only ${daysLeft} days left! [FleetCRM]`;
                await sendSMS(admin.mobile, message);
            }
        }
    } catch (smsErr) {
        console.error('Immediate SMS Error:', smsErr.message);
    }
    */


    res.json({ message: 'Document uploaded successfully', vehicle });
});

// @desc    Upload driver document
// @route   POST /api/admin/drivers/:id/documents
// @access  Private/Admin
// @access  Private/Admin
const uploadDriverDocument = asyncHandler(async (req, res) => {
    const { documentType, expiryDate } = req.body;
    const driver = await User.findById(req.params.id);

    if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'Document file is required' });
    }

    // Remove old document of same type if exists
    driver.documents = driver.documents.filter(doc => doc.documentType !== documentType);

    driver.documents.push({
        documentType,
        imageUrl: req.file.path,
        expiryDate: (expiryDate && expiryDate !== 'undefined' && expiryDate !== '') ? new Date(expiryDate) : undefined,
        verificationStatus: 'Pending'
    });

    await driver.save();
    res.json({ message: 'Document uploaded successfully', driver });
});

// @desc    Verify or Reject driver document
// @route   PATCH /api/admin/drivers/:id/documents/:docId/verify
// @access  Private/Admin
// @access  Private/Admin
const verifyDriverDocument = asyncHandler(async (req, res) => {
    const { status } = req.body; // 'Verified' or 'Rejected'
    const driver = await User.findById(req.params.id);

    if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
    }

    const doc = driver.documents.id(req.params.docId);
    if (!doc) {
        return res.status(404).json({ message: 'Document not found' });
    }

    doc.verificationStatus = status;
    await driver.save();

    res.json({ message: `Document ${status} successfully`, driver });
});

// @desc    Get Daily Reports
// @route   GET /api/admin/reports/:companyId
// @access  Private/Admin
const getDailyReports = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { date, from, to, bypassCache, _t } = req.query; // format: YYYY-MM-DD

    const cacheKey = `reports_${companyId}_${from || ''}_${to || ''}_${date || ''}_${_t || ''}`;
    if (!bypassCache && !_t && DASHBOARD_CACHE.has(cacheKey)) {
        const cached = DASHBOARD_CACHE.get(cacheKey);
        if (Date.now() - cached.time < CACHE_TTL) {
            return res.json(cached.data);
        }
    }

    const baseQuery = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ]
    };

    let startDate, endDate;
    let dateQuery = {};
    if (from && to) {
        dateQuery = { date: { $gte: from, $lte: to } };
        startDate = DateTime.fromISO(from, { zone: 'Asia/Kolkata' }).startOf('day').toJSDate();
        endDate = DateTime.fromISO(to, { zone: 'Asia/Kolkata' }).endOf('day').toJSDate();
    } else if (date) {
        dateQuery = { date };
        startDate = DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).startOf('day').toJSDate();
        endDate = DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).endOf('day').toJSDate();
    }

    const query = {
        ...baseQuery,
        ...dateQuery
    };

    // 1. Fetch Attendance Reports ( Staff + Freelancers)
    const rawAttendance = await Attendance.find(query)
        .populate('driver', 'name mobile isFreelancer')
        .populate('vehicle', 'carNumber model isOutsideCar carType dutyAmount fastagNumber fastagBalance')
        .sort({ date: -1, createdAt: -1 })
        .lean();

    const attendance = rawAttendance.map(a => ({
        ...a,
        isFreelancer: a.isFreelancer || a.driver?.isFreelancer || false,
        isOutsideCar: a.vehicle?.isOutsideCar || false, // Pass this to UI
        entryType: 'attendance'
    }));

    // 2. Fetch Outside Cars (Freelancer vehicles logged as vehicles)
    // We filter by date using the #date tag in carNumber
    const dateFilter = date || (from && to ? { $gte: from, $lte: to } : null);

    let outsideVehicles = [];
    if (date) {
        outsideVehicles = await Vehicle.find({
            $or: [
                { company: new mongoose.Types.ObjectId(companyId) },
                { company: companyId }
            ],
            isOutsideCar: true,
            carNumber: { $regex: `#${date}(#|$)` }
        });
    } else if (from && to) {
        // For range, we might need a more complex regex or multiple queries
        // Simplest: fetch all outside cars of company and filter in memory
        const allOutside = await Vehicle.find({
            $or: [
                { company: new mongoose.Types.ObjectId(companyId) },
                { company: companyId }
            ],
            isOutsideCar: true
        });
        outsideVehicles = allOutside.filter(v => {
            const parts = v.carNumber?.split('#');
            const d = parts ? parts[1] : null;
            return d >= from && d <= to;
        });
    }

    // Wrap outside vehicles to match attendance structure for Excel/UI
    const mappedOutside = outsideVehicles.map(v => ({
        _id: v._id,
        date: v.carNumber?.split('#')[1],
        driver: { name: v.driverName, mobile: '-' },
        vehicle: v,
        punchIn: { time: v.createdAt, km: 0 },
        punchOut: { time: v.createdAt, km: 0 },
        status: 'completed',
        dailyWage: v.dutyAmount,
        pickUpLocation: v.dutyType,
        dropLocation: v.dropLocation,
        isOutsideCar: true,
        entryType: 'voucher'
    }));

    // 1b. Build vehicle->date fuel map from Fuel collection (covers admin-entered & company driver fuels)
    const fuelQueryForAttendance = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ]
    };
    if (startDate && endDate) {
        fuelQueryForAttendance.date = { $gte: startDate, $lte: endDate };
    } else if (date) {
        fuelQueryForAttendance.date = { $gte: new Date(`${date}T00:00:00`), $lte: new Date(`${date}T23:59:59`) };
    }
    const allFuelForAttendance = await Fuel.find(fuelQueryForAttendance).populate('vehicle', 'carNumber').lean();

    // 1c. Build vehicle->date parking map from Parking collection
    const parkingQueryForAttendance = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ]
    };
    if (startDate && endDate) {
        parkingQueryForAttendance.date = { $gte: startDate, $lte: endDate };
    } else if (date) {
        parkingQueryForAttendance.date = { $gte: new Date(`${date}T00:00:00`), $lte: new Date(`${date}T23:59:59`) };
    }
    const allParkingForAttendance = await Parking.find({
        ...parkingQueryForAttendance,
        // Exclude car services (wash/puncture) from the general parking total in Attendance records
        serviceType: { $ne: 'car_service' }
    }).lean();

    // OPTIMIZED: Use Maps for O(1) lookups instead of .filter in a loop
    const fuelByAttId = new Map();
    const fuelByVehicleDate = new Map();
    allFuelForAttendance.forEach(f => {
        if (f.attendance) {
            const attId = String(f.attendance);
            if (!fuelByAttId.has(attId)) fuelByAttId.set(attId, []);
            fuelByAttId.get(attId).push(f);
        }
        const fDateStr = f.date instanceof Date ? f.date.toISOString().split('T')[0] : String(f.date).split('T')[0];
        const vId = String(f.vehicle?._id || f.vehicle || '');
        const key = `${vId}_${fDateStr}`;
        if (!fuelByVehicleDate.has(key)) fuelByVehicleDate.set(key, []);
        fuelByVehicleDate.get(key).push(f);
    });

    const parkingByAttId = new Map();
    const parkingByVehicleDate = new Map();
    allParkingForAttendance.forEach(p => {
        if (p.attendanceId) {
            const attId = String(p.attendanceId);
            if (!parkingByAttId.has(attId)) parkingByAttId.set(attId, []);
            parkingByAttId.get(attId).push(p);
        }
        const pDateStr = p.date instanceof Date ? p.date.toISOString().split('T')[0] : String(p.date).split('T')[0];
        const vId = String(p.vehicle?._id || p.vehicle || '');
        const key = `${vId}_${pDateStr}`;
        if (!parkingByVehicleDate.has(key)) parkingByVehicleDate.set(key, []);
        parkingByVehicleDate.get(key).push(p);
    });

    const enrichedAttendance = attendance.map(a => {
        const attendanceId = String(a._id || '');
        const vId = String(a.vehicle?._id || a.vehicle || '');
        const attDate = a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date);
        const vKey = `${vId}_${attDate}`;

        const matchedFuels = fuelByAttId.get(attendanceId) || fuelByVehicleDate.get(vKey) || [];
        const fuelFromCollection = matchedFuels.reduce((s, f) => s + (Number(f.amount) || 0), 0);

        const matchedParking = parkingByAttId.get(attendanceId) || parkingByVehicleDate.get(vKey) || [];
        const parkingFromCollection = matchedParking.reduce((s, p) => s + (Number(p.amount) || 0), 0);

        const existingFuel = Number(a.fuel?.amount) || 0;
        const totalFuel = fuelFromCollection > 0 ? fuelFromCollection : existingFuel;

        const existingParking = Number(a.punchOut?.tollParkingAmount) || 0;
        const totalParking = parkingFromCollection > 0 ? parkingFromCollection : existingParking;

        return {
            ...a,
            fuel: {
                ...(a.fuel || {}),
                amount: totalFuel,
                entries: a.fuel?.entries?.length
                    ? a.fuel.entries
                    : matchedFuels.map(f => ({ amount: f.amount, fuelType: f.fuelType, km: f.odometer }))
            },
            punchOut: a.punchOut
                ? { ...a.punchOut, tollParkingAmount: totalParking }
                : { tollParkingAmount: totalParking }
        };
    });

    const finalReports = [...enrichedAttendance, ...mappedOutside].sort((a, b) => b.date.localeCompare(a.date));

    // 2. Fetch Fastag Recharges
    let fastagRecharges = [];
    if (startDate && endDate) {
        fastagRecharges = await Vehicle.aggregate([
            {
                $match: {
                    $or: [
                        { company: new mongoose.Types.ObjectId(companyId) },
                        { company: companyId }
                    ]
                }
            },
            { $unwind: '$fastagHistory' },
            {
                $match: {
                    'fastagHistory.date': {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            {
                $project: {
                    _id: '$fastagHistory._id',
                    carNumber: 1,
                    vehicle: { carNumber: '$carNumber', _id: '$_id' },
                    date: '$fastagHistory.date',
                    amount: '$fastagHistory.amount',
                    method: '$fastagHistory.method',
                    remarks: '$fastagHistory.remarks',
                    driver: { name: 'System / Fastag' }
                }
            },
            { $sort: { date: -1 } }
        ]);
    }

    // 3. Fetch Border Tax
    const borderTaxQuery = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ]
    };
    if (from && to) {
        borderTaxQuery.date = { $gte: from, $lte: to };
    } else if (date) {
        borderTaxQuery.date = date;
    }

    const borderTax = await BorderTax.find(borderTaxQuery)
        .populate('vehicle', 'carNumber model')
        .populate('driver', 'name mobile')
        .sort({ date: -1 });

    // 4. Fetch Fuel Entries (using Date objects)
    const fuelQuery = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ]
    };
    if (startDate && endDate) {
        fuelQuery.date = { $gte: startDate, $lte: endDate };
    }
    const fuel = await Fuel.find(fuelQuery)
        .populate('vehicle', 'carNumber')
        .sort({ date: -1 });

    // 5. Fetch Maintenance Records (Exclude Driver Services like Wash/Puncture)
    const maintenanceQuery = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ]
    };
    if (startDate && endDate) {
        maintenanceQuery.billDate = { $gte: startDate, $lte: endDate };
    }

    // Keyword-based exclusion for Maintenance
    const serviceRegex = /wash|puncture|puncher|tissue|water|cleaning|mask|sanitizer/i;

    let maintenance = await Maintenance.find(maintenanceQuery)
        .populate('vehicle', 'carNumber model')
        .sort({ billDate: -1 });

    // Apply strict filtering for Daily Reports to match Maintenance page
    maintenance = maintenance.filter(m => {
        const cat = String(m.category || '').toLowerCase();
        const desc = String(m.description || '').toLowerCase();
        const typeValue = String(m.maintenanceType || '').toLowerCase();
        return !serviceRegex.test(cat) && !serviceRegex.test(desc) && !serviceRegex.test(typeValue);
    });

    // 6. Fetch Advances
    const advancesQuery = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ]
    };
    if (startDate && endDate) {
        advancesQuery.date = { $gte: startDate, $lte: endDate };
    }
    // Exclude Auto-Generated Salary entries
    advancesQuery.remark = { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ };

    const advances = await Advance.find(advancesQuery)
        .populate('driver', 'name mobile')
        .sort({ date: -1 });

    // 7. Fetch Parking Records (Exclude Car Services)
    const parkingQuery = {
        $and: [
            {
                $or: [
                    { company: new mongoose.Types.ObjectId(companyId) },
                    { company: companyId }
                ]
            },
            {
                $or: [{ serviceType: 'parking' }, { serviceType: { $exists: false } }, { serviceType: null }]
            }
        ]
    };
    if (startDate && endDate) {
        parkingQuery.date = { $gte: startDate, $lte: endDate };
    }
    const parking = await Parking.find(parkingQuery)
        .populate('vehicle', 'carNumber model')
        .sort({ date: -1 });

    // 8. Fetch Accident Logs
    const accidentQuery = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ]
    };
    if (startDate && endDate) {
        accidentQuery.date = { $gte: startDate, $lte: endDate };
    }
    const accidentLogs = await AccidentLog.find(accidentQuery)
        .populate('vehicle', 'carNumber model')
        .populate('driver', 'name mobile')
        .sort({ date: -1 });

    // 9. Fetch Parts Warranty
    const warrantyQuery = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ]
    };
    if (startDate && endDate) {
        warrantyQuery.purchaseDate = { $gte: startDate, $lte: endDate };
    }
    const partsWarranty = await PartsWarranty.find(warrantyQuery)
        .populate('vehicle', 'carNumber model')
        .sort({ date: -1 });

    const finalResponse = {
        attendance: finalReports,
        fastagRecharges,
        borderTax,
        fuel,
        maintenance,
        advances,
        parking,
        accidentLogs,
        partsWarranty
    };

    if (req.user && req.user.role === 'Executive') {
        const p = req.user.permissions || {};

        if (!p.driversService) {
            finalResponse.attendance = finalResponse.attendance.filter(a => a.isOutsideCar);
            finalResponse.advances = [];
        }

        if (!p.buySell) {
            finalResponse.attendance = finalResponse.attendance.filter(a => !a.isOutsideCar);
        }

        if (!p.vehiclesManagement) {
            finalResponse.fastagRecharges = [];
            finalResponse.borderTax = [];
            finalResponse.fuel = [];
            finalResponse.maintenance = [];
            finalResponse.parking = [];
            finalResponse.accidentLogs = [];
            finalResponse.partsWarranty = [];
        }
    }

    DASHBOARD_CACHE.set(cacheKey, { data: finalResponse, time: Date.now() });
    res.json(finalResponse);
});

const approveNewTrip = asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    const driver = await User.findById(driverId);
    if (!driver) {
        res.status(404);
        throw new Error('Driver not found');
    }

    // Release any vehicle currently linked to this driver
    await Vehicle.updateMany({ currentDriver: driverId }, { currentDriver: null });

    driver.tripStatus = 'approved';
    await driver.save();
    res.json({ message: 'Driver approved for new trip' });
});




// @desc    Add Border Tax entry by Admin
// @route   POST /api/admin/border-tax
// @access  Private/Admin
const addBorderTax = asyncHandler(async (req, res) => {
    const { vehicleId, driverId, borderName, amount, date, remarks, companyId } = req.body;

    if (!vehicleId || !borderName || !amount || !date || !companyId) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const receiptPhoto = req.file ? req.file.path.replace(/\\/g, '/') : null;

    const entry = await BorderTax.create({
        company: companyId,
        vehicle: vehicleId,
        driver: driverId,
        borderName,
        amount: Number(amount),
        date,
        remarks,
        receiptPhoto: receiptPhoto
    });

    res.status(201).json(entry);
});

// @desc    Get Border Tax entries
// @route   GET /api/admin/border-tax/:companyId
// @access  Private/Admin
const getBorderTaxEntries = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { from, to } = req.query;

    let query = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ]
    };
    if (from && to) {
        query.date = { $gte: from, $lte: to };
    }

    const entries = await BorderTax.find(query)
        .populate('vehicle', 'carNumber')
        .populate('driver', 'name')
        .sort({ date: -1 });

    res.json(entries);
});

// @desc    Recharge Fastag for a vehicle
// @route   POST /api/admin/vehicles/:id/fastag-recharge
// @access  Private/Admin
const rechargeFastag = asyncHandler(async (req, res) => {
    const { amount, method, remarks, date } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
    }

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
        return res.status(400).json({ message: 'Please provide a valid recharge amount' });
    }

    const rechargeAmount = Number(amount);

    // Update balance and history
    vehicle.fastagBalance = (vehicle.fastagBalance || 0) + rechargeAmount;
    vehicle.fastagHistory.push({
        amount: rechargeAmount,
        method: method || 'Manual',
        remarks: remarks || '',
        date: date ? new Date(date) : new Date()
    });

    await vehicle.save();

    res.json({
        message: 'Fastag recharged successfully',
        carNumber: vehicle.carNumber,
        newBalance: vehicle.fastagBalance
    });
});

// @desc    Update Fastag Recharge
// @route   PUT /api/admin/vehicles/:id/fastag-recharge/:historyId
// @access  Private/Admin
const updateFastagRecharge = asyncHandler(async (req, res) => {
    const { amount, method, remarks, date } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
    }

    const historyEntry = vehicle.fastagHistory.id(req.params.historyId);
    if (!historyEntry) {
        return res.status(404).json({ message: 'History entry not found' });
    }

    // Adjust balance: subtract old and add new
    const oldAmount = Number(historyEntry.amount) || 0;
    const newAmount = Number(amount);

    if (isNaN(newAmount) || newAmount <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
    }

    vehicle.fastagBalance = (vehicle.fastagBalance || 0) - oldAmount + newAmount;

    // Update entry
    historyEntry.amount = newAmount;
    historyEntry.method = method || historyEntry.method;
    historyEntry.remarks = remarks || historyEntry.remarks;
    if (date) historyEntry.date = new Date(date);

    await vehicle.save();
    res.json({ message: 'Fastag entry updated', newBalance: vehicle.fastagBalance });
});

// @desc    Delete Fastag Recharge
// @route   DELETE /api/admin/vehicles/:id/fastag-recharge/:historyId
// @access  Private/Admin
const deleteFastagRecharge = asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
    }

    const historyEntry = vehicle.fastagHistory.id(req.params.historyId);
    if (!historyEntry) {
        return res.status(404).json({ message: 'History entry not found' });
    }

    // Adjust balance 
    const entryAmount = Number(historyEntry.amount) || 0;
    vehicle.fastagBalance = (vehicle.fastagBalance || 0) - entryAmount;

    // Remove entry
    vehicle.fastagHistory.pull(req.params.historyId);

    await vehicle.save();
    res.json({ message: 'Fastag entry deleted', newBalance: vehicle.fastagBalance });
});

const logToFile = (msg) => {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] DEBUG: ${msg}\n`;
    try {
        fs.appendFileSync(path.join(process.cwd(), 'server_debug.log'), logMsg);
    } catch (e) {
        console.error('Failed to write to log file', e);
    }
};

// @desc    Freelancer Punch In (Manual by Admin)
// @route   POST /api/admin/freelancers/punch-in
// @access  Private/Admin
const freelancerPunchIn = asyncHandler(async (req, res) => {
    const { driverId, vehicleId, km, time, pickUpLocation } = req.body;
    logToFile(`[FREELANCER_PUNCH_IN] Triggered for Driver: ${driverId}, Vehicle: ${vehicleId}, Time: ${time}`);

    const driver = await User.findById(driverId);
    const vehicle = await Vehicle.findById(vehicleId);

    if (!driver || !vehicle) {
        return res.status(404).json({ message: 'Driver or Vehicle not found' });
    }

    if (!driver.isFreelancer) {
        return res.status(400).json({ message: 'This is not a freelancer driver' });
    }

    // Create attendance record
    const dutyDate = req.body.date || DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');

    // Check if already on an active shift (Tightened check to prevent dual active rotations)
    const existing = await Attendance.findOne({ driver: driverId, status: 'incomplete' });
    if (existing) {
        // If the new duty is for today AND there's already an active shift today, block it.
        // But if we're adding/starting a duty for a PREVIOUS date, allow it.
        if (existing.date === dutyDate) {
            return res.status(400).json({ message: `Driver is already on an active shift started on ${existing.date}` });
        }
        logToFile(`[FREELANCER_PUNCH_IN] Allowing past duty entry for ${dutyDate} while driver has active shift from ${existing.date}`);
    }

    const attendance = new Attendance({
        driver: driverId,
        company: driver.company,
        vehicle: vehicleId,
        date: dutyDate,
        dailyWage: driver.dailyWage || 0,
        punchIn: {
            km: km || 0,
            time: time ? new Date(time) : new Date(dutyDate + 'T12:00:00Z'),
        },
        pickUpLocation: pickUpLocation,
        status: 'incomplete'
    });

    if (req.files) {
        if (req.files.selfie) attendance.punchIn.selfie = req.files.selfie[0].path;
        if (req.files.kmPhoto) attendance.punchIn.kmPhoto = req.files.kmPhoto[0].path;
        if (req.files.carSelfie) attendance.punchIn.carSelfie = req.files.carSelfie[0].path;
    }

    // Sync createdAt with duty date for history
    attendance.createdAt = new Date(dutyDate + 'T12:00:00Z');


    await attendance.save();

    // Clear dashboard cache on mutation
    DASHBOARD_CACHE.clear();

    logToFile(`[FREELANCER_PUNCH_IN] Attendance record saved: ${attendance._id}`);

    // 4. Update Driver
    logToFile(`[FREELANCER_PUNCH_IN] Updating Driver ${driver.name}: TripStatus ${driver.tripStatus} -> active`);
    driver.tripStatus = 'active';
    driver.assignedVehicle = vehicleId;
    await driver.save();
    logToFile(`[FREELANCER_PUNCH_IN] Driver saved successfully. New Status: ${driver.tripStatus}`);

    // 5. Update Vehicle (and clean up its old driver if any)
    if (vehicle.currentDriver && vehicle.currentDriver.toString() !== driverId) {
        logToFile(`[FREELANCER_PUNCH_IN] Releasing old driver ${vehicle.currentDriver} from vehicle ${vehicle.carNumber}`);
        await User.findByIdAndUpdate(vehicle.currentDriver, { assignedVehicle: null, tripStatus: 'approved' });
    }

    logToFile(`[FREELANCER_PUNCH_IN] Assigning vehicle ${vehicle.carNumber} to driver ${driverId}`);
    vehicle.currentDriver = driverId;
    if (Number(km) > (vehicle.lastOdometer || 0)) {
        vehicle.lastOdometer = Number(km);
    }
    await vehicle.save();
    logToFile(`[FREELANCER_PUNCH_IN] Vehicle saved successfully.`);

    res.json({ message: 'Freelancer assigned and duty started', attendance });
});

// @desc    Freelancer Punch Out (Manual by Admin)
// @route   POST /api/admin/freelancers/punch-out
// @access  Private/Admin
const freelancerPunchOut = asyncHandler(async (req, res) => {
    try {
        const { driverId, km, time, fuelAmount, parkingAmount, review, dailyWage, dropLocation, parkingPaidBy, allowanceTA, nightStayAmount } = req.body;
        logToFile(`[FREELANCER_PUNCH_OUT] Triggered for Driver: ${driverId}, Time: ${time}, KM: ${km}`);

        const driver = await User.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        // Extract date from provided time to match specific attendance record
        const targetDate = time ? time.split('T')[0] : null;

        // Find the incomplete attendance
        let attendance = null;
        if (targetDate) {
            attendance = await Attendance.findOne({
                driver: driverId,
                date: targetDate,
                status: 'incomplete'
            });
        }

        if (!attendance) {
            attendance = await Attendance.findOne({
                driver: driverId,
                status: 'incomplete'
            }).sort({ createdAt: -1 });
        }

        if (!attendance) {
            return res.status(400).json({ message: 'No active punch-in found for this driver' });
        }

        if (dailyWage) {
            attendance.dailyWage = Number(dailyWage);
        }

        attendance.punchOut = {
            km: km || 0,
            time: time ? new Date(time) : new Date(),
            otherRemarks: review,
            tollParkingAmount: Number(parkingAmount) || 0,
            allowanceTA: Number(allowanceTA) || 0,
            nightStayAmount: Number(nightStayAmount) || 0,
            parkingPaidBy: parkingPaidBy || 'Self'
        };

        if (req.files) {
            if (req.files.selfie) attendance.punchOut.selfie = req.files.selfie[0].path;
            if (req.files.kmPhoto) attendance.punchOut.kmPhoto = req.files.kmPhoto[0].path;
            if (req.files.parkingPhoto) attendance.punchOut.parkingReceipt = req.files.parkingPhoto[0].path;
            if (req.files.carSelfie) attendance.punchOut.carSelfie = req.files.carSelfie[0].path;
        }

        // 4. Fuel Data (Deduplicated with Admin source)
        if (Number(fuelAmount) > 0) {
            attendance.fuel = { filled: true, amount: Number(fuelAmount) };

            // Check if fuel entry already exists for this attendance (e.g. from Driver App)
            const existingFuel = await Fuel.findOne({ attendance: attendance._id });
            if (!existingFuel) {
                await Fuel.create({
                    vehicle: attendance.vehicle,
                    company: driver.company,
                    fuelType: 'Diesel',
                    date: attendance.date ? new Date(attendance.date) : new Date(),
                    amount: Number(fuelAmount),
                    quantity: Number(fuelAmount) / 100, // Estimate instead of 1L
                    rate: 100,
                    odometer: km || 0,
                    stationName: 'Freelancer Entry',
                    paymentMode: 'Cash',
                    paymentSource: 'Yatree Office',
                    driver: driver.name,
                    source: 'Admin',
                    attendance: attendance._id,
                    createdBy: req.user._id
                });
            } else {
                // Duplicate found - just sync the amount if needed, but don't overwrite real qty/rate
                existingFuel.amount = Number(fuelAmount);
                if (existingFuel.quantity < 0.1) { // If it was a dummy 0 value
                    existingFuel.quantity = Number(fuelAmount) / 100;
                    existingFuel.rate = 100;
                }
                await existingFuel.save();
            }
        }

        attendance.dropLocation = dropLocation;
        attendance.totalKM = Math.max(0, (Number(km) || 0) - (attendance.punchIn.km || 0));
        attendance.status = 'completed';
        // Create a Parking entry if amount > 0
        if (Number(parkingAmount) > 0) {
            await Parking.create({
                vehicle: attendance.vehicle,
                company: driver.company,
                driver: driver.name,
                driverId: driver._id,
                attendanceId: attendance._id,
                date: attendance.date ? new Date(attendance.date) : new Date(),
                amount: Number(parkingAmount),
                location: dropLocation || 'Duty End',
                remark: review || 'Freelancer Duty Off',
                source: 'Admin',
                receiptPhoto: attendance.punchOut.parkingReceipt,
                createdBy: req.user._id,
                isReimbursable: true
            });
        }

        // Update driver status
        driver.tripStatus = 'approved';
        driver.assignedVehicle = null;
        driver.freelancerReview = review;
        await driver.save();

        // Clear vehicle status
        if (attendance.vehicle) {
            const v = await Vehicle.findById(attendance.vehicle);
            if (v) {
                v.currentDriver = null;
                if (Number(km) > (v.lastOdometer || 0)) {
                    v.lastOdometer = Number(km);
                }
                await v.save();
            }
        }

        await attendance.save();

        // Clear dashboard cache on mutation
        DASHBOARD_CACHE.clear();

        res.json({ message: 'Duty ended successfully', attendance });
    } catch (error) {
        console.error('ERROR IN FREELANCER_PUNCH_OUT:', error);
        logToFile(`[FREELANCER_PUNCH_OUT] ERROR: ${error.message}`);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// @desc    Admin Punch In (Manual by Admin)
// @route   POST /api/admin/punch-in
// @access  Private/Admin
const adminPunchIn = asyncHandler(async (req, res) => {
    const { driverId, vehicleId, km, time, pickUpLocation, date } = req.body;

    const driver = await User.findById(driverId);
    const vehicle = await Vehicle.findById(vehicleId);

    if (!driver || !vehicle) {
        return res.status(404).json({ message: 'Driver or Vehicle not found' });
    }

    const dutyDate = date || DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');

    // Check if ya to active shift hai
    const existing = await Attendance.findOne({ driver: driverId, status: 'incomplete' });
    if (existing) {
        // If the new duty is for today AND there's already an active shift today, block it.
        // But if we're adding/starting a duty for a PREVIOUS date, allow it.
        if (existing.date === dutyDate) {
            return res.status(400).json({ message: `Driver is already on an active shift started on ${existing.date}` });
        }
    }

    const attendance = new Attendance({
        driver: driverId,
        company: driver.company,
        vehicle: vehicleId,
        date: dutyDate,
        dailyWage: driver.dailyWage || 0,
        punchIn: {
            km: Number(km) || 0,
            time: time ? new Date(time) : new Date(),
        },
        pickUpLocation: pickUpLocation || 'Office',
        status: 'incomplete'
    });

    // Sync createdAt for manual entries
    attendance.createdAt = new Date(dutyDate + 'T12:00:00Z');

    await attendance.save();

    // Clear dashboard cache on mutation
    DASHBOARD_CACHE.clear();

    // Update Driver
    driver.tripStatus = 'active';
    driver.assignedVehicle = vehicleId;
    await driver.save();

    // Update Vehicle
    if (vehicle.currentDriver && vehicle.currentDriver.toString() !== driverId) {
        await User.findByIdAndUpdate(vehicle.currentDriver, { assignedVehicle: null, tripStatus: 'completed' });
    }
    vehicle.currentDriver = driverId;
    if (Number(km) > (vehicle.lastOdometer || 0)) {
        vehicle.lastOdometer = Number(km);
    }
    await vehicle.save();

    res.json({ message: 'Driver punched in by admin', attendance });
});

// @desc    Admin Punch Out (Manual by Admin)
// @route   POST /api/admin/punch-out
// @access  Private/Admin
const adminPunchOut = asyncHandler(async (req, res) => {
    const { driverId, km, time, fuelAmount, parkingAmount, review, dailyWage, dropLocation, parkingPaidBy } = req.body;

    const driver = await User.findById(driverId);
    if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
    }

    // Extract date from provided time to match specific attendance record
    const targetDate = time ? time.split('T')[0] : null;
    console.log(`[PunchOut] Driver: ${driverId}, TargetDate: ${targetDate}, ProvidedTime: ${time}`);

    // Find the incomplete attendance
    let attendance = null;
    if (targetDate) {
        attendance = await Attendance.findOne({
            driver: driverId,
            date: targetDate,
            status: 'incomplete'
        });
    }

    if (!attendance) {
        attendance = await Attendance.findOne({
            driver: driverId,
            status: 'incomplete'
        }).sort({ createdAt: -1 });
    }

    if (!attendance) {
        console.error(`[PunchOut Error] No incomplete shift found for driver ${driverId} (targetDate: ${targetDate})`);
        return res.status(400).json({ message: 'No active shift found to punch out' });
    }

    console.log(`[PunchOut] Found attendance record: ${attendance._id} for date ${attendance.date}`);

    if (dailyWage) attendance.dailyWage = Number(dailyWage);

    attendance.punchOut = {
        km: Number(km) || 0,
        time: time ? new Date(time) : new Date(),
        otherRemarks: review || '',
        tollParkingAmount: Number(parkingAmount) || 0,
        parkingPaidBy: parkingPaidBy || 'Self'
    };

    if (fuelAmount) {
        attendance.fuel = {
            filled: true,
            amount: Number(fuelAmount) || 0,
            entries: [{ amount: Number(fuelAmount), paymentSource: 'Yatree Office' }]
        };
    }

    attendance.dropLocation = dropLocation || 'Office';
    attendance.totalKM = Math.max(0, (Number(km) || 0) - (attendance.punchIn.km || 0));
    attendance.status = 'completed';
    await attendance.save();

    // Clear dashboard cache on mutation
    DASHBOARD_CACHE.clear();

    // Create Parking entry
    if (Number(parkingAmount) > 0) {
        await Parking.create({
            vehicle: attendance.vehicle,
            company: driver.company,
            driver: driver.name,
            driverId: driverId,
            attendanceId: attendance._id,
            date: attendance.date ? new Date(attendance.date) : new Date(),
            amount: Number(parkingAmount),
            source: 'Admin',
            notes: `Admin Punch-Out Parking (Paid By: ${parkingPaidBy || 'Self'})`,
            createdBy: req.user._id,
            isReimbursable: parkingPaidBy === 'Office' ? false : true
        });
    }

    // Update driver status
    driver.tripStatus = 'completed';
    driver.assignedVehicle = null;
    await driver.save();

    // Release vehicle
    if (attendance.vehicle) {
        const vehicle = await Vehicle.findById(attendance.vehicle);
        if (vehicle) {
            vehicle.currentDriver = null;
            if (Number(km) > (vehicle.lastOdometer || 0)) {
                vehicle.lastOdometer = Number(km);
            }
            await vehicle.save();
        }
    }

    res.json({ message: 'Driver punched out by admin', attendance });
});

// @desc    Add manual duty entry for a driver
// @route   POST /api/admin/manual-duty
// @access  Private/Admin
const addManualDuty = asyncHandler(async (req, res) => {
    const {
        driverId,
        vehicleId,
        companyId,
        date,
        punchInKM,
        punchOutKM,
        punchInTime,
        punchOutTime,
        pickUpLocation,
        dropLocation,
        fuelAmount,
        parkingAmount,
        dailyWage,
        review,
        allowanceTA,
        nightStayAmount,
        otherBonus,
        parkingPaidBy,
        eventId
    } = req.body;

    if (!driverId || !vehicleId || !companyId || !date) {
        return res.status(400).json({ message: 'Please provide required fields: driver, vehicle, company, and date' });
    }

    const driver = await User.findById(driverId);
    if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Allowed admin to add manual duty even if driver is currently active (e.g. for past missing duties)

    const attendance = new Attendance({
        driver: driverId,
        company: companyId,
        vehicle: vehicleId,
        date: date, // YYYY-MM-DD
        status: 'completed',
        dailyWage: Number(dailyWage) || driver.dailyWage || 0,
        eventId: eventId && eventId !== 'undefined' ? eventId : undefined,
        punchIn: {
            km: Number(punchInKM) || 0,
            time: punchInTime ? new Date(punchInTime) : DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: 'Asia/Kolkata' }).set({ hour: 8 }).toJSDate(),
            remarks: 'Regular', // Punch-in remark
            location: { address: pickUpLocation || 'Office' }
        },
        punchOut: {
            km: Number(punchOutKM) || 0,
            time: punchOutTime ? new Date(punchOutTime) : DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: 'Asia/Kolkata' }).set({ hour: 20 }).toJSDate(),
            remarks: 'Manual Entry',
            otherRemarks: review || '',
            tollParkingAmount: Number(parkingAmount) || 0,
            allowanceTA: Number(allowanceTA) || 0,
            nightStayAmount: Number(nightStayAmount) || 0,
            parkingPaidBy: parkingPaidBy || 'Self'
        },
        outsideTrip: {
            bonusAmount: Number(otherBonus) || 0
        },
        totalKM: Math.max(0, (Number(punchOutKM) || 0) - (Number(punchInKM) || 0)),
        pickUpLocation: pickUpLocation || 'Office',
        dropLocation: dropLocation || 'Office',
        fuel: {
            filled: Number(fuelAmount) > 0,
            amount: Number(fuelAmount) || 0
        }
    });

    // Deduplicated Fuel Entry
    if (Number(fuelAmount) > 0) {
        const existingFuel = await Fuel.findOne({ attendance: attendance._id });
        if (!existingFuel) {
            await Fuel.create({
                vehicle: vehicleId,
                company: companyId,
                fuelType: 'Diesel',
                date: new Date(date),
                amount: Number(fuelAmount),
                quantity: Number(fuelAmount) / 100, // Estimate instead of 1L
                rate: 100,
                odometer: Number(punchInKM) || 0,
                driver: driver.name,
                createdBy: req.user._id,
                source: 'Admin',
                attendance: attendance._id
            });
        }
    }

    // Create standalone Parking entry for manual duties
    if (Number(parkingAmount) > 0) {
        await Parking.create({
            vehicle: vehicleId,
            company: companyId,
            driver: driver.name,
            driverId: driverId,
            attendanceId: attendance._id,
            date: new Date(date),
            amount: Number(parkingAmount),
            location: dropLocation || 'Manual Entry',
            remark: review || 'Manual Duty Entry',
            source: 'Admin',
            createdBy: req.user._id,
            isReimbursable: true
        });
    }

    // For historical entries, we set createdAt to match the duty date
    attendance.createdAt = punchInTime ? new Date(punchInTime) : new Date(date + 'T08:00:00Z');

    await attendance.save();

    // Update vehicle odometer if recent
    if (vehicleId && Number(punchOutKM) > 0) {
        await syncVehicleOdometer(vehicleId);
    }

    // Ensure we create a Parking entry so it gets tracked properly in Driver Salaries
    if (Number(parkingAmount) > 0) {
        await Parking.create({
            vehicle: vehicleId,
            company: companyId,
            driver: driver.name,
            driverId: driverId,
            attendanceId: attendance._id,
            date: new Date(date),
            amount: Number(parkingAmount),
            source: 'Admin',
            notes: `Manual Duty Parking (Paid By: ${parkingPaidBy || 'Self'})`,
            createdBy: req.user._id,
            isReimbursable: parkingPaidBy === 'Office' ? false : true
        });
    }

    // If freelancer, we don't need to change tripStatus to active, 
    // but we should ensure they aren't marked as "on duty" now.
    // However, if this is a manual entry for a FINISHED duty, we just leave them as is or ensure they are 'approved' (available).
    if (driver.isFreelancer) {
        driver.tripStatus = 'approved';
        driver.assignedVehicle = null;
        await driver.save();

        // Ensure vehicle is free and odometer is latest
        if (vehicle.currentDriver && vehicle.currentDriver.toString() === driverId.toString()) {
            vehicle.currentDriver = null;
        }
    }

    // Always update odometer if this manual entry is the latest
    if (Number(punchOutKM) > (vehicle.lastOdometer || 0)) {
        vehicle.lastOdometer = Number(punchOutKM);
    }
    await vehicle.save();

    res.status(201).json({ message: 'Manual duty entry created successfully', attendance });
});

// @desc    Delete Border Tax entry
// @route   DELETE /api/admin/border-tax/:id
// @access  Private/Admin
const deleteBorderTax = asyncHandler(async (req, res) => {
    const entry = await BorderTax.findById(req.params.id);

    if (entry) {
        await entry.deleteOne();
        res.json({ message: 'Border tax entry removed successfully' });
    } else {
        res.status(404).json({ message: 'Entry not found' });
    }
});

// @desc    Add vehicle maintenance record
// @route   POST /api/admin/maintenance
// @access  Private/Admin
const addMaintenanceRecord = asyncHandler(async (req, res) => {
    const {
        vehicleId,
        companyId,
        maintenanceType,
        category,
        partsChanged,
        description,
        garageName,
        billNumber,
        billDate,
        amount,
        paymentMode,
        currentKm,
        nextServiceKm,
        nextServiceDate,
        status,
        driverId
    } = req.body;

    const maintenanceData = {
        vehicle: vehicleId,
        company: companyId,
        driver: driverId || null,
        maintenanceType,
        category,
        partsChanged: partsChanged ? (typeof partsChanged === 'string' ? JSON.parse(partsChanged) : partsChanged) : [],
        description,
        garageName,
        billNumber,
        billDate,
        amount,
        paymentMode,
        currentKm,
        nextServiceKm,
        nextServiceDate,
        status,
        createdBy: req.user._id
    };

    if (req.file) {
        maintenanceData.billPhoto = req.file.path;
    }

    const record = await Maintenance.create(maintenanceData);

    // Update vehicle lastOdometer if currentKm provided is higher
    if (currentKm) {
        const vehicle = await Vehicle.findById(vehicleId);
        if (vehicle && Number(currentKm) > (vehicle.lastOdometer || 0)) {
            vehicle.lastOdometer = Number(currentKm);
            await vehicle.save();
        }
    }

    // Clear dashboard cache on mutation
    DASHBOARD_CACHE.clear();

    res.status(201).json(record);
});

// @desc    Get all maintenance records for a company
// @route   GET /api/admin/maintenance/:companyId
// @access  Private/Admin
const getMaintenanceRecords = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { month, year, startDate, endDate, type: requestType } = req.query;

    let query = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ]
    };

    let parkingQuery = {
        company: companyId,
        serviceType: 'car_service'
    };

    let attendanceQuery = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ],
        'pendingExpenses.type': { $in: ['other', 'parking', 'wash', 'puncture', 'tissue', 'water'] }
    };

    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        query.billDate = { $gte: start, $lte: end };
        parkingQuery.date = { $gte: start, $lte: end };
        attendanceQuery.createdAt = { $gte: start, $lte: end };
    } else if (year && year !== 'All') {
        if (month && month !== 'All') {
            const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endOfMonth = new Date(parseInt(year), parseInt(month), 0);
            endOfMonth.setHours(23, 59, 59, 999);
            query.billDate = { $gte: startOfMonth, $lte: endOfMonth };
            parkingQuery.date = { $gte: startOfMonth, $lte: endOfMonth };
            attendanceQuery.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
        } else {
            const startOfYear = new Date(parseInt(year), 0, 1);
            const endOfYear = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
            query.billDate = { $gte: startOfYear, $lte: endOfYear };
            parkingQuery.date = { $gte: startOfYear, $lte: endOfYear };
            attendanceQuery.createdAt = { $gte: startOfYear, $lte: endOfYear };
        }
    }

    const [mainRecords, parkingRecords, attendanceDocs] = await Promise.all([
        Maintenance.find(query)
            .populate('vehicle', 'carNumber model')
            .populate('driver', 'name')
            .sort({ billDate: -1 })
            .lean(),
        Parking.find(parkingQuery)
            .populate('vehicle', 'carNumber model')
            .populate('driverId', 'name')
            .sort({ date: -1 }),
        Attendance.find(attendanceQuery)
            .populate('vehicle', 'carNumber model')
            .populate('driver', 'name')
            .sort({ createdAt: -1 })
    ]);

    // Map parking records to maintenance format
    const mappedParking = parkingRecords.map(p => ({
        _id: p._id,
        vehicle: p.vehicle,
        driver: p.driverId,
        maintenanceType: 'Car Service',
        category: p.remark || 'Car Service (Driver Entry)',
        description: `Location: ${p.location || 'N/A'}. Remark: ${p.remark || 'N/A'}. Notes: ${p.notes || ''}`,
        billDate: p.date,
        amount: p.amount,
        billPhoto: p.receiptPhoto,
        paymentMode: 'Other',
        source: 'Driver App'
    }));

    // Flatten and map pending expenses from attendance
    let mappedPending = [];
    attendanceDocs.forEach(doc => {
        if (!doc.pendingExpenses) return;
        doc.pendingExpenses.forEach(exp => {
            const remark = (exp.remark || '').toLowerCase();
            const fuelTypeStr = (exp.fuelType || '').toLowerCase();

            const isWash = exp.type === 'wash' || fuelTypeStr.includes('wash') || remark.includes('wash');
            const isPuncture = exp.type === 'puncture' || fuelTypeStr.includes('punc') || remark.includes('punc');
            const isTissue = exp.type === 'tissue' || fuelTypeStr.includes('tissue') || remark.includes('tissue');
            const isWater = exp.type === 'water' || fuelTypeStr.includes('water') || remark.includes('water');

            // Only show if not fully approved or deleted and it matches Driver Services criteria
            if ((isWash || isPuncture || isTissue || isWater || exp.type === 'other') && exp.status !== 'approved' && exp.status !== 'deleted') {
                mappedPending.push({
                    _id: exp._id,
                    attendanceId: doc._id,
                    vehicle: doc.vehicle,
                    driver: doc.driver,
                    maintenanceType: 'Car Service',
                    category: isWash ? 'Car Wash' : isPuncture ? 'Puncture Repair' : isTissue ? 'Tissue' : isWater ? 'Water' : (exp.fuelType || 'Other Service'),
                    description: `[UNAPPROVED] Driver Log: ${exp.remark || exp.fuelType || 'Manual Entry'}. KM: ${exp.km || 'N/A'}`,
                    billDate: exp.createdAt || doc.date,
                    amount: exp.amount,
                    billPhoto: exp.slipPhoto,
                    paymentMode: 'Pending Approval',
                    source: 'Driver App',
                    status: exp.status || 'pending'
                });
            }
        });
    });
    let combined = [...mainRecords, ...mappedParking, ...mappedPending];

    if (requestType === 'driver_services') {
        combined = combined.filter(r => {
            const cat = String(r.category || '').toLowerCase();
            const desc = String(r.description || '').toLowerCase();

            // Strictly check for Wash, Puncture, Tissue, Water
            const isWash = cat.includes('wash') || desc.includes('wash');
            const isPuncture = cat.includes('punc') || desc.includes('punc');
            const isTissue = cat.includes('tissue') || desc.includes('tissue');
            const isWater = (cat.includes('water') && !cat.includes('repair') && !cat.includes('leak') && !cat.includes('pump')) ||
                (desc.includes('water') && !desc.includes('repair') && !desc.includes('leak') && !desc.includes('pump'));

            return isWash || isPuncture || isTissue || isWater;
        });
    } else {
        // Exclude driver services from the main maintenance view
        combined = combined.filter(r => {
            const cat = String(r.category || '').toLowerCase();
            const desc = String(r.description || '').toLowerCase();

            const isWash = cat.includes('wash') || desc.includes('wash');
            const isPuncture = cat.includes('punc') || desc.includes('punc');
            const isTissue = cat.includes('tissue') || desc.includes('tissue');
            const isWater = (cat.includes('water') && !cat.includes('repair') && !cat.includes('pump')) ||
                (desc.includes('water') && !desc.includes('repair') && !desc.includes('pump'));

            return !(isWash || isPuncture || isTissue || isWater);
        });
    }

    combined.sort((a, b) => new Date(b.billDate) - new Date(a.billDate));

    // Apply manual date filter for combined results if range is provided (mappedPending isn't pre-filtered by $gte in the query for simplicity of overlapping months)
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        combined = combined.filter(r => {
            const d = new Date(r.billDate);
            return d >= start && d <= end;
        });
    }

    res.json(combined);
});

// @desc    Update maintenance record
// @route   PUT /api/admin/maintenance/:id
// @access  Private/Admin
const updateMaintenanceRecord = asyncHandler(async (req, res) => {
    // Clear dashboard cache on any mutation
    DASHBOARD_CACHE.clear();
    const { id } = req.params;
    let targetDoc = null;
    let docType = 'maintenance';

    // 1. Try Maintenance Collection
    targetDoc = await Maintenance.findById(id);

    // 2. Try Parking Collection
    if (!targetDoc) {
        targetDoc = await Parking.findById(id);
        if (targetDoc) docType = 'parking';
    }

    // 3. Try Attendance Pending Expenses
    let attendanceDoc = null;
    if (!targetDoc) {
        attendanceDoc = await Attendance.findOne({ 'pendingExpenses._id': id });
        if (attendanceDoc) {
            targetDoc = attendanceDoc.pendingExpenses.find(e => e._id.toString() === id);
            docType = 'attendance';
        }
    }

    if (!targetDoc) {
        res.status(404);
        throw new Error('Record not found in any collection');
    }

    const {
        vehicleId,
        maintenanceType,
        category,
        partsChanged,
        description,
        garageName,
        billNumber,
        billDate,
        amount,
        paymentMode,
        currentKm,
        nextServiceKm,
        status,
        driverId
    } = req.body;

    if (docType === 'maintenance') {
        if (vehicleId) targetDoc.vehicle = vehicleId;
        if (driverId !== undefined) targetDoc.driver = driverId || null;
        if (maintenanceType) targetDoc.maintenanceType = maintenanceType;
        if (category) targetDoc.category = category;
        if (partsChanged) targetDoc.partsChanged = (typeof partsChanged === 'string' ? JSON.parse(partsChanged) : partsChanged);
        if (description) targetDoc.description = description;
        if (garageName) targetDoc.garageName = garageName;
        if (billNumber) targetDoc.billNumber = billNumber;
        if (billDate) targetDoc.billDate = billDate;
        if (amount) targetDoc.amount = Number(amount);
        if (paymentMode) targetDoc.paymentMode = paymentMode;
        if (currentKm) targetDoc.currentKm = Number(currentKm);
        if (nextServiceKm) targetDoc.nextServiceKm = Number(nextServiceKm);
        if (status) targetDoc.status = status;
        if (req.file) targetDoc.billPhoto = req.file.path;

        const updated = await targetDoc.save();
        res.json(updated);
    } else if (docType === 'parking') {
        if (amount) targetDoc.amount = Number(amount);
        if (category) targetDoc.remark = category;
        if (description) targetDoc.notes = description;
        if (billDate) targetDoc.date = billDate;
        if (req.file) targetDoc.receiptPhoto = req.file.path;

        const updated = await targetDoc.save();
        res.json(updated);
    } else if (docType === 'attendance') {
        if (amount) targetDoc.amount = Number(amount);
        if (category) targetDoc.fuelType = category; // Attendance uses fuelType for the expense label
        if (description) targetDoc.remark = description;
        if (req.file) targetDoc.slipPhoto = req.file.path;
        if (status) targetDoc.status = status;
        if (currentKm) targetDoc.km = Number(currentKm);

        await attendanceDoc.save();
        res.json(targetDoc);
    }
});

// @desc    Delete maintenance record
// @route   DELETE /api/admin/maintenance/:id
// @access  Private/Admin
const deleteMaintenanceRecord = asyncHandler(async (req, res) => {
    // Clear dashboard cache on any mutation
    DASHBOARD_CACHE.clear();
    const { id } = req.params;

    // 1. Try Maintenance Collection
    const record = await Maintenance.findById(id);
    if (record) {
        await record.deleteOne();
        return res.json({ message: 'Maintenance record removed' });
    }

    // 2. Try Parking Collection
    const parkingRecord = await Parking.findById(id);
    if (parkingRecord) {
        await parkingRecord.deleteOne();
        return res.json({ message: 'Parking record removed' });
    }

    // 3. Try Attendance Pending Expenses
    const attendanceDoc = await Attendance.findOne({ 'pendingExpenses._id': id });
    if (attendanceDoc) {
        attendanceDoc.pendingExpenses = attendanceDoc.pendingExpenses.filter(e => e._id.toString() !== id);
        await attendanceDoc.save();
        return res.json({ message: 'Pending expense removed from attendance' });
    }

    // Clear dashboard cache on mutation
    DASHBOARD_CACHE.clear();

    res.status(404).json({ message: 'Record not found in any collection' });
});

// Helper to recalculate fuel metrics using the "Previous Fill" logic
const recalculateFuelMetrics = async (vehicleId) => {
    const entries = await Fuel.find({ vehicle: vehicleId }).sort({ odometer: 1, date: 1 });
    let prevOdometer = null;
    let prevQuantity = null;
    let prevAmount = null;
    let prevRate = null;

    for (const entry of entries) {
        if (prevOdometer === null) {
            entry.distance = 0;
            entry.mileage = 0;
            entry.costPerKm = 0;
        } else {
            entry.distance = entry.odometer - prevOdometer;

            if (entry.distance > 0 && prevAmount > 0 && prevRate > 0) {
                // Formula: Mileage = Distance / (Amount / Rate)
                // This simplifies to: (Distance * Rate) / Amount
                entry.mileage = Number(((entry.distance * prevRate) / prevAmount).toFixed(2));
                // Cost/KM = Amount paid previously / Distance covered now
                entry.costPerKm = Number((prevAmount / entry.distance).toFixed(2));
            } else {
                entry.distance = 0;
                entry.mileage = 0;
                entry.costPerKm = 0;
            }
        }
        await entry.save();
        prevOdometer = entry.odometer;
        prevQuantity = entry.quantity;
        prevAmount = entry.amount;
        prevRate = entry.rate;
    }
};

// @desc    Add Fuel Entry
// @route   POST /api/admin/fuel
// @access  Private/Admin
const addFuelEntry = asyncHandler(async (req, res) => {
    const {
        vehicleId,
        companyId,
        fuelType,
        date,
        amount,
        quantity,
        rate,
        odometer,
        stationName,
        paymentMode,
        paymentSource,
        driver,
        slipPhoto
    } = req.body;

    if (!vehicleId || !companyId || !fuelType || !amount || !quantity || !odometer) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const fuelEntry = await Fuel.create({
        vehicle: vehicleId,
        company: companyId,
        fuelType,
        date: date || new Date(),
        amount: Number(amount),
        quantity: Number(quantity),
        rate: Number(rate),
        odometer: Number(odometer),
        stationName,
        paymentMode,
        paymentSource: paymentSource || 'Yatree Office',
        driver,
        slipPhoto,
        createdBy: req.user._id
    });

    // Try to link to Attendance to prevent duplication in Reports
    try {
        const searchDate = DateTime.fromJSDate(new Date(date || new Date())).setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
        const attendance = await Attendance.findOne({ vehicle: vehicleId, date: searchDate });
        if (attendance) {
            fuelEntry.attendance = attendance._id;
            await fuelEntry.save();

            // Sync Attendance Fuel Summary
            if (!attendance.fuel) attendance.fuel = { filled: false, entries: [], amount: 0 };
            const existsInAtt = attendance.fuel.entries.some(e => e.amount === Number(amount) && e.km === Number(odometer));
            if (!existsInAtt) {
                attendance.fuel.filled = true;
                attendance.fuel.entries.push({
                    amount: Number(amount),
                    km: Number(odometer),
                    fuelType: fuelType,
                    paymentSource: paymentSource || 'Yatree Office'
                });
                attendance.fuel.amount = (attendance.fuel.amount || 0) + Number(amount);
                await attendance.save();
            }
        }
    } catch (e) { console.error('Link Error:', e); }

    // Recalculate chain to ensure perfect mileage
    await recalculateFuelMetrics(vehicleId);

    res.status(201).json(fuelEntry);
});

// @desc    Get Fuel Entries
// @route   GET /api/admin/fuel/:companyId
// @access  Private/Admin
const getFuelEntries = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { from, to, vehicleId } = req.query;

    let query = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ]
    };

    // Date Range filtering
    if (from && to) {
        const startDate = new Date(from);
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        query.date = { $gte: startDate, $lte: endDate };
    }

    if (vehicleId) {
        query.vehicle = vehicleId;
    }

    const entries = await Fuel.find(query)
        .populate('vehicle', 'carNumber model')
        .sort({ date: -1, odometer: -1 });

    res.json(entries);
});

// @desc    Update Fuel Entry
// @route   PUT /api/admin/fuel/:id
// @access  Private/Admin
const updateFuelEntry = asyncHandler(async (req, res) => {
    const {
        vehicleId,
        fuelType,
        date,
        amount,
        quantity,
        rate,
        odometer,
        stationName,
        paymentMode,
        paymentSource,
        driver,
        slipPhoto
    } = req.body;

    const entry = await Fuel.findById(req.params.id);
    if (!entry) {
        res.status(404);
        throw new Error('Fuel entry not found');
    }

    entry.vehicle = vehicleId || entry.vehicle;
    entry.fuelType = fuelType || entry.fuelType;
    entry.date = date || entry.date;
    entry.amount = Number(amount) || entry.amount;
    entry.quantity = Number(quantity) || entry.quantity;
    entry.rate = Number(rate) || entry.rate;
    entry.odometer = Number(odometer) || entry.odometer;
    entry.stationName = stationName || entry.stationName;
    entry.paymentMode = paymentMode || entry.paymentMode;
    entry.paymentSource = paymentSource || entry.paymentSource;
    entry.driver = driver || entry.driver;

    if (slipPhoto && slipPhoto.trim() !== '') {
        entry.slipPhoto = slipPhoto;
    }

    await entry.save();

    // Recalculate chain to ensure perfect mileage after update
    await recalculateFuelMetrics(entry.vehicle);

    res.json({ message: 'Entry updated successfully' });
});


// @desc    Get all pending fuel expenses for a company
// @route   GET /api/admin/fuel/pending/:companyId
// @access  Private/Admin
const getPendingFuelExpenses = asyncHandler(async (req, res) => {
    try {
        const { companyId } = req.params;
        const pendingDocs = await Attendance.find({
            $or: [
                { company: new mongoose.Types.ObjectId(companyId) },
                { company: companyId }
            ],
            'pendingExpenses.type': 'fuel',
            'pendingExpenses.status': 'pending'
        })
            .populate('driver', 'name')
            .populate('vehicle', 'carNumber')
            .sort({ date: -1 });

        let formattedExpenses = [];

        pendingDocs.forEach(doc => {
            if (!doc.pendingExpenses) return;

            doc.pendingExpenses.forEach(exp => {
                if (exp.type === 'fuel' && exp.status === 'pending') {
                    formattedExpenses.push({
                        _id: exp._id,
                        attendanceId: doc._id,
                        date: exp.createdAt || doc.date,
                        driver: doc.driver?.name || 'Unknown',
                        carNumber: doc.vehicle?.carNumber || 'Unknown',
                        amount: exp.amount,
                        quantity: exp.quantity, // Pass Quantity if available
                        rate: exp.rate, // Pass Rate if available
                        km: exp.km,
                        fuelType: exp.fuelType || 'Diesel',
                        paymentSource: exp.paymentSource || 'Yatree Office',
                        slipPhoto: exp.slipPhoto,
                        status: 'pending'
                    });
                }
            });
        });

        res.json(formattedExpenses);
    } catch (error) {
        console.error("Error fetching pending fuel:", error);
        res.status(500).json({ message: 'Error fetching pending fuel' });
    }
});

// @desc    Get all pending parking + other (Car Wash/Puncture) expenses
// @route   GET /api/admin/parking/pending/:companyId
// @access  Private/AdminOrExecutive
const getPendingParkingExpenses = asyncHandler(async (req, res) => {
    try {
        const { companyId } = req.params;
        const statusFilter = req.query.status || 'pending'; // 'pending' or 'rejected'
        // Fetch docs that have parking OR other (car wash, puncture) pending expenses
        const pendingDocs = await Attendance.find({
            company: companyId,
            'pendingExpenses.status': statusFilter,
            'pendingExpenses.type': 'parking'
        })
            .populate('driver', 'name')
            .populate('vehicle', 'carNumber')
            .sort({ date: -1 });

        let formattedExpenses = [];

        pendingDocs.forEach(doc => {
            if (!doc.pendingExpenses) return;

            doc.pendingExpenses.forEach(exp => {
                // Include both 'parking' and 'other' (Car Wash, Puncture) expenses matching status
                if (exp.type === 'parking' && exp.status === statusFilter) {
                    formattedExpenses.push({
                        ...exp.toObject(),
                        attendanceId: doc._id,
                        driver: doc.driver?.name || 'Unknown',
                        carNumber: doc.vehicle?.carNumber || 'N/A',
                        date: doc.date
                    });
                }
            });
        });

        res.json(formattedExpenses);
    } catch (error) {
        console.error("Error fetching parking/other expenses:", error);
        res.status(500).json({ message: 'Error fetching parking expenses' });
    }
});

// @desc    Get all pending Car Service (Car Wash/Puncture) expenses
// @route   GET /api/admin/maintenance/pending/:companyId
// @access  Private/AdminOrExecutive
const getPendingMaintenanceExpenses = asyncHandler(async (req, res) => {
    try {
        const { companyId } = req.params;
        const statusFilter = req.query.status || 'pending'; // 'pending' or 'rejected'
        const pendingDocs = await Attendance.find({
            company: companyId,
            'pendingExpenses.status': statusFilter,
            'pendingExpenses.type': 'other'
        })
            .populate('driver', 'name')
            .populate('vehicle', 'carNumber')
            .sort({ date: -1 });

        let formattedExpenses = [];

        pendingDocs.forEach(doc => {
            if (!doc.pendingExpenses) return;

            doc.pendingExpenses.forEach(exp => {
                if (exp.type === 'other' && exp.status === statusFilter) {
                    formattedExpenses.push({
                        ...exp.toObject(),
                        attendanceId: doc._id,
                        driver: doc.driver?.name || 'Unknown',
                        carNumber: doc.vehicle?.carNumber || 'N/A',
                        date: doc.date
                    });
                }
            });
        });

        res.json(formattedExpenses);
    } catch (error) {
        console.error("Error fetching pending maintenance expenses:", error);
        res.status(500).json({ message: 'Error fetching maintenance expenses' });
    }
});


// @desc    Delete Fuel Entry
// @route   DELETE /api/admin/fuel/:id
// @access  Private/Admin
const deleteFuelEntry = asyncHandler(async (req, res) => {
    const entry = await Fuel.findById(req.params.id);
    if (!entry) {
        res.status(404);
        throw new Error('Fuel entry not found');
    }
    const vehicleId = entry.vehicle;
    await Fuel.findByIdAndDelete(req.params.id);

    // Recalculate chain after deletion
    await recalculateFuelMetrics(vehicleId);

    res.json({ message: 'Entry removed' });
});

// @desc    Approve or Reject a pending expense from Attendance
// @route   PATCH /api/admin/attendance/:attendanceId/expense/:expenseId
// @access  Private/Admin
const approveRejectExpense = asyncHandler(async (req, res) => {
    const { attendanceId, expenseId } = req.params;
    const { status } = req.body; // 'approved', 'rejected', or 'deleted'

    console.log(`[approveRejectExpense] Processing: attendanceId=${attendanceId}, expenseId=${expenseId}, status=${status}`);

    if (!['approved', 'rejected', 'deleted'].includes(status)) {
        res.status(400);
        throw new Error('Invalid status');
    }

    const attendance = await Attendance.findById(attendanceId).populate('driver').populate('vehicle');
    if (!attendance) {
        res.status(404);
        throw new Error('Attendance record not found');
    }

    // Safety check: ensure vehicle and driver are populated
    const vehicleId = attendance.vehicle?._id || attendance.vehicle;
    const driverName = attendance.driver?.name || 'Unknown Driver';

    if (!vehicleId) {
        console.error('[approveRejectExpense] Vehicle not found on attendance:', attendanceId);
        res.status(400);
        throw new Error('Vehicle not linked to this attendance record');
    }

    const expenseIndex = attendance.pendingExpenses.findIndex(e => e._id.toString() === expenseId);
    if (expenseIndex === -1) {
        res.status(404);
        throw new Error('Expense entry not found');
    }

    const expense = attendance.pendingExpenses[expenseIndex];

    // Allow re-approving rejected entries, but not re-processing already approved ones
    if (expense.status === 'approved' && status !== 'deleted') {
        res.status(400);
        throw new Error('This expense has already been approved');
    }

    // Handle permanent deletion
    if (status === 'deleted') {
        attendance.pendingExpenses.splice(expenseIndex, 1);
        await attendance.save();
        console.log(`[approveRejectExpense] Expense permanently deleted from attendance ${attendanceId}`);
        return res.json({ message: 'Expense permanently deleted' });
    }

    expense.status = status;

    if (status === 'approved') {
        if (expense.type === 'fuel') {
            // Optional overrides from Admin
            const { amount, quantity, rate, slipPhoto } = req.body;
            let finalOdometer = Number(req.body.odometer || expense.km || 0);
            let finalAmount = Number(amount || expense.amount || 0);
            // Use admin override OR driver's submitted quantity. Default to 1 to avoid validation error.
            let finalQuantity = quantity ? Number(quantity) : (expense.quantity ? Number(expense.quantity) : 1);
            // Calculate rate: admin override OR driver's rate OR amount/quantity
            let finalRate = rate ? Number(rate) : (expense.rate ? Number(expense.rate) : (finalQuantity > 0 ? Number((finalAmount / finalQuantity).toFixed(2)) : finalAmount));

            // Use Admin provided slipPhoto if available, otherwise fallback to driver's
            const finalSlipPhoto = (req.body.slipPhoto !== undefined) ? req.body.slipPhoto : (expense.slipPhoto || '');

            // Sanitize paymentSource — driver app may send 'Guest' but model requires 'Guest / Client'
            const validPaymentSources = ['Yatree Office', 'Guest / Client'];
            const rawPaymentSource = expense.paymentSource || 'Yatree Office';
            const finalPaymentSource = validPaymentSources.includes(rawPaymentSource)
                ? rawPaymentSource
                : rawPaymentSource.toLowerCase().includes('guest')
                    ? 'Guest / Client'
                    : 'Yatree Office';

            console.log(`[approveRejectExpense] Creating fuel entry: vehicleId=${vehicleId}, amount=${finalAmount}, qty=${finalQuantity}, rate=${finalRate}, odometer=${finalOdometer}, paymentSource=${finalPaymentSource}`);

            // Dedup check: If admin already entered this fuel manually via Reports or Fuel page
            const existingFuel = await Fuel.findOne({
                vehicle: vehicleId,
                amount: finalAmount,
                $or: [
                    { attendance: attendanceId },
                    { odometer: finalOdometer }
                ]
            });

            if (existingFuel) {
                console.log(`[approveRejectExpense] Fuel record already exists (Deduplicated): ${existingFuel._id}`);
                if (!existingFuel.attendance) {
                    existingFuel.attendance = attendanceId;
                    await existingFuel.save();
                }
            } else {
                // 1. Add to Fuel Collection
                await Fuel.create({
                    vehicle: vehicleId,
                    company: attendance.company,
                    fuelType: expense.fuelType || 'Diesel',
                    date: expense.createdAt || new Date(),
                    amount: finalAmount,
                    quantity: finalQuantity,
                    rate: finalRate,
                    odometer: finalOdometer,
                    paymentSource: finalPaymentSource,
                    driver: driverName,
                    createdBy: req.user._id,
                    source: 'Driver',
                    stationName: req.body.stationName || '',
                    slipPhoto: finalSlipPhoto,
                    attendance: attendanceId
                });
            }

            // Recalculate chain to ensure perfect mileage
            await recalculateFuelMetrics(vehicleId);

            // 2. Add to verified fuel entries in Attendance
            if (!attendance.fuel) attendance.fuel = { filled: false, entries: [], amount: 0 };
            attendance.fuel.filled = true;
            attendance.fuel.entries.push({
                amount: finalAmount,
                km: finalOdometer,
                fuelType: expense.fuelType || 'Diesel',
                slipPhoto: finalSlipPhoto
            });
            attendance.fuel.amount = (attendance.fuel.amount || 0) + finalAmount;

        } else if (expense.type === 'parking') {
            const { amount, slipPhoto } = req.body;
            const finalAmount = Number(amount || expense.amount || 0);
            const finalSlipPhoto = (req.body.slipPhoto !== undefined) ? req.body.slipPhoto : (expense.slipPhoto || '');
            const driverId = attendance.driver?._id || attendance.driver;

            console.log(`[approveRejectExpense] Creating parking entry: vehicleId=${vehicleId}, amount=${finalAmount}`);

            // 1. Add to Parking Collection
            await Parking.create({
                vehicle: vehicleId,
                company: attendance.company,
                driver: driverName,
                driverId: driverId,
                date: expense.createdAt || new Date(),
                amount: finalAmount,
                source: 'Driver',
                receiptPhoto: finalSlipPhoto,
                createdBy: req.user._id
            });

        } else if (['other', 'wash', 'puncture', 'tissue', 'water'].includes(expense.type)) {
            // Car Wash, Puncture, or other services
            const { amount, slipPhoto } = req.body;
            const finalAmount = Number(amount || expense.amount || 0);
            const finalSlipPhotoValue = (req.body.slipPhoto !== undefined) ? req.body.slipPhoto : (expense.slipPhoto || '');
            const driverId = attendance.driver?._id || attendance.driver;

            console.log(`[approveRejectExpense] Creating maintenance/other entry: vehicleId=${vehicleId}, amount=${finalAmount}, type=${expense.fuelType || 'Other'}`);

            // Create a maintenance record for things like Wash/Puncture
            await Maintenance.create({
                vehicle: vehicleId,
                company: attendance.company,
                driver: attendance.driver?._id || attendance.driver,
                maintenanceType: 'Driver Service',
                category: expense.fuelType || 'Other',
                description: `Approved Driver Service: ${expense.fuelType || 'Other'}`,
                amount: finalAmount,
                billDate: expense.createdAt || new Date(),
                billPhoto: finalSlipPhotoValue,
                status: 'Completed',
                createdBy: req.user._id,
                // Add a source field if needed, but not in model? 
                // Let's just use description to track
            });
        }
    }

    await attendance.save();
    // Clear dashboard cache on mutation
    DASHBOARD_CACHE.clear();

    res.json({ message: `Expense ${status} successfully`, attendance });
});

// @desc    Add driver advance
// @route   POST /api/admin/advances
// @access  Private/Admin
const addAdvance = asyncHandler(async (req, res) => {
    const { driverId, companyId, amount, remark, date, advanceType, givenBy } = req.body;

    const driver = await User.findById(driverId);
    if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
    }

    const advance = await Advance.create({
        driver: driverId,
        company: companyId,
        amount: Number(amount),
        remark: remark || 'Advance Payment',
        date: date || new Date(),
        status: 'Pending',
        createdBy: req.user._id,
        advanceType: advanceType || 'Office',
        givenBy: givenBy || 'Office'
    });

    if (advance) {
        res.status(201).json(advance);
    } else {
        res.status(400).json({ message: 'Invalid advance data' });
    }
});

// @desc    Get all advances for a company or specific driver
// @route   GET /api/admin/advances/:companyId
// @access  Private/Admin
const getAdvances = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { driverId, month, year, from, to } = req.query;

    const query = { company: companyId };
    if (driverId) query.driver = driverId;

    if (from && to) {
        const startDate = DateTime.fromISO(from, { zone: 'Asia/Kolkata' }).startOf('day').toJSDate();
        const endDate = DateTime.fromISO(to, { zone: 'Asia/Kolkata' }).endOf('day').toJSDate();
        query.date = { $gte: startDate, $lte: endDate };
    } else if (month && year) {
        const startOfMonth = DateTime.fromObject({ year: parseInt(year), month: parseInt(month), day: 1 }, { zone: 'Asia/Kolkata' }).startOf('month').toJSDate();
        const endOfMonth = DateTime.fromObject({ year: parseInt(year), month: parseInt(month), day: 1 }, { zone: 'Asia/Kolkata' }).endOf('month').toJSDate();
        query.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    // Exclude Auto-Generated Salary entries
    query.remark = { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ };

    const advances = await Advance.find(query)
        .populate({
            path: 'driver',
            select: 'name mobile isFreelancer'
        })
        .sort({ date: -1 });

    // Filter by isFreelancer if requested
    let filteredAdvances = advances.filter(adv => adv.driver);

    if (req.query.isFreelancer !== undefined) {
        const isFreelancer = req.query.isFreelancer === 'true';
        filteredAdvances = filteredAdvances.filter(adv => adv.driver.isFreelancer === isFreelancer);
    }

    res.json(filteredAdvances);
});

// @desc    Delete advance record
// @route   DELETE /api/admin/advances/:id
// @access  Private/Admin
const deleteAdvance = asyncHandler(async (req, res) => {
    const advance = await Advance.findById(req.params.id);

    if (advance) {
        await advance.deleteOne();
        res.json({ message: 'Advance record removed' });
    } else {
        res.status(404).json({ message: 'Advance record not found' });
    }
});

// @desc    Update advance record
// @route   PUT /api/admin/advances/:id
// @access  Private/Admin
const updateAdvance = asyncHandler(async (req, res) => {
    const { amount, remark, date, advanceType, givenBy, driverId } = req.body;
    const advance = await Advance.findById(req.params.id);

    if (advance) {
        if (amount !== undefined) advance.amount = Number(amount);
        if (remark !== undefined) advance.remark = remark;
        if (date !== undefined) advance.date = date;
        if (advanceType !== undefined) advance.advanceType = advanceType;
        if (givenBy !== undefined) advance.givenBy = givenBy;
        if (driverId) advance.driver = driverId;

        const updatedAdvance = await advance.save();
        res.json(updatedAdvance);
    } else {
        res.status(404).json({ message: 'Advance record not found' });
    }
});

const getDriverSalarySummaryInternal = async (companyId, month, year, isFreelancerOnly = false) => {
    // 1. Get all drivers in company
    const driverQuery = {
        company: companyId,
        role: 'Driver'
    };

    if (isFreelancerOnly) {
        driverQuery.isFreelancer = true;
    } else {
        driverQuery.isFreelancer = { $ne: true };
    }

    const drivers = await User.find(driverQuery).select('name mobile dailyWage salary').lean();
    if (!drivers.length) return [];

    const driverIds = drivers.map(d => d._id);
    const driverNamesMap = new Map();
    drivers.forEach(d => {
        if (d.name) {
            driverNamesMap.set(d.name.trim().toLowerCase(), d._id.toString());
        }
    });

    // 2. Prepare Date range
    let startStr, endStr, startJS, endJS;
    if (month && year) {
        try {
            const startOfMonth = DateTime.fromObject({ year: parseInt(year), month: parseInt(month), day: 1 }, { zone: 'Asia/Kolkata' }).startOf('month');
            const endOfMonth = startOfMonth.endOf('month');
            startJS = startOfMonth.toJSDate();
            endJS = endOfMonth.toJSDate();
            startStr = startOfMonth.toFormat('yyyy-MM-dd');
            endStr = endOfMonth.toFormat('yyyy-MM-dd');
        } catch (e) {
            console.error('[getDriverSalarySummaryInternal] Date parsing error:', e);
        }
    }

    // 3. Concurrent Bulk Fetches
    const attendanceQuery = {
        driver: { $in: driverIds },
        status: 'completed'
    };
    if (startStr && endStr) {
        // Match by string date field (most records) OR by punchIn.time (fallback for older records)
        attendanceQuery.$or = [
            { date: { $gte: startStr, $lte: endStr } },
            {
                date: { $exists: false },
                'punchIn.time': { $gte: startJS, $lte: endJS }
            }
        ];
    }

    const advanceQuery = {
        driver: { $in: driverIds }
    };
    if (startJS) advanceQuery.date = { $gte: startJS, $lte: endJS };
    advanceQuery.remark = { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ };

    const parkingQuery = {
        company: companyId,
        isReimbursable: { $ne: false },
        serviceType: { $ne: 'car_service' }
    };
    if (startJS) parkingQuery.date = { $gte: startJS, $lte: endJS };

    const allTimeAdvanceQuery = {
        driver: { $in: driverIds },
        remark: { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ }
    };

    const [allAttendance, allMonthlyAdvances, allParking, allTimeAdvances] = await Promise.all([
        Attendance.find(attendanceQuery).lean(),
        Advance.find(advanceQuery).lean(),
        Parking.find(parkingQuery).lean(),
        Advance.find(allTimeAdvanceQuery).lean()
    ]);

    // Grouping records by driver for efficient lookup
    const attByDriver = new Map();
    const advByDriver = new Map();
    const parkingByDriver = new Map();
    const allTimeAdvByDriver = new Map();

    allAttendance.forEach(a => {
        if (!a.driver) return;
        const dId = a.driver.toString();
        if (!attByDriver.has(dId)) attByDriver.set(dId, []);
        attByDriver.get(dId).push(a);
    });
    allMonthlyAdvances.forEach(a => {
        if (!a.driver) return;
        const dId = a.driver.toString();
        if (!advByDriver.has(dId)) advByDriver.set(dId, []);
        advByDriver.get(dId).push(a);
    });
    allTimeAdvances.forEach(a => {
        if (!a.driver) return;
        const dId = a.driver.toString();
        if (!allTimeAdvByDriver.has(dId)) allTimeAdvByDriver.set(dId, []);
        allTimeAdvByDriver.get(dId).push(a);
    });
    allParking.forEach(p => {
        let dId = p.driverId?.toString();
        if (!dId && p.driver) {
            dId = driverNamesMap.get(p.driver.trim().toLowerCase());
        }
        if (dId) {
            if (!parkingByDriver.has(dId)) parkingByDriver.set(dId, []);
            parkingByDriver.get(dId).push(p);
        }
    });

    // 4. Summarize each driver
    const summaries = drivers.map(driver => {
        try {
            const dId = driver._id.toString();
            const driverAtt = attByDriver.get(dId) || [];
            const driverAdv = advByDriver.get(dId) || [];
            const driverParking = parkingByDriver.get(dId) || [];
            const driverAllTimeAdv = allTimeAdvByDriver.get(dId) || [];

            // Earnings Calculation
            const dailyAggs = new Map();
            const datesProcessed = new Set();
            driverAtt.forEach(att => {
                const dateStr = att.date;
                let wage = 0;
                if (!datesProcessed.has(dateStr)) {
                    wage = (Number(att.dailyWage) || 0) || (driver.dailyWage ? Number(driver.dailyWage) : 0) || (driver.salary ? Math.round(Number(driver.salary) / 26) : 0) || 0;
                    datesProcessed.add(dateStr);
                }
                const sameDayReturn = Number(att.punchOut?.allowanceTA) || 0;
                const nightStay = Number(att.punchOut?.nightStayAmount) || 0;
                // bonusAmount often includes the above, so we take the max to avoid doubling
                const bonuses = Math.max(sameDayReturn + nightStay, Number(att.outsideTrip?.bonusAmount) || 0);

                if (!dailyAggs.has(dateStr)) {
                    dailyAggs.set(dateStr, { earnings: 0, nights: 0, sameDays: 0, pureWage: 0, bonusTotal: 0 });
                }
                const current = dailyAggs.get(dateStr);
                current.earnings += (wage + bonuses);
                current.pureWage += wage;
                current.bonusTotal += bonuses;
                if (Number(att.punchOut?.nightStayAmount) > 0) current.nights += 1;
                if (Number(att.punchOut?.allowanceTA) > 0) current.sameDays += 1;
            });

            const externalParkingByDay = new Map();
            driverParking.forEach(p => {
                if (!p.date) return;
                const dateStr = DateTime.fromJSDate(p.date).setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
                externalParkingByDay.set(dateStr, (externalParkingByDay.get(dateStr) || 0) + (Number(p.amount) || 0));
            });

            const allUniqueDates = new Set([...dailyAggs.keys(), ...externalParkingByDay.keys()]);
            let totalCalculatedEarnings = 0;
            allUniqueDates.forEach(dateStr => {
                const attData = dailyAggs.get(dateStr) || { earnings: 0 };
                const extP = externalParkingByDay.get(dateStr) || 0;
                totalCalculatedEarnings += (attData.earnings + extP);
            });

            // Advance Calculation
            const totalAdvancesThisMonth = driverAdv.reduce((sum, adv) => sum + (Number(adv.amount) || 0), 0);
            const totalRecoveredThisMonth = driverAdv.reduce((sum, adv) => sum + (Number(adv.recoveredAmount) || 0), 0);
            const allTimeGiven = driverAllTimeAdv.reduce((sum, adv) => sum + (Number(adv.amount) || 0), 0);
            const allTimeRecovered = driverAllTimeAdv.reduce((sum, adv) => sum + (Number(adv.recoveredAmount) || 0), 0);
            const pendingAdvance = allTimeGiven - allTimeRecovered;

            // Aggregator recalculation for cleaner summary
            let totalWages = 0;
            let totalBonuses = 0;
            let totalParking = 0;
            dailyAggs.forEach(v => {
                totalWages += (v.pureWage || 0);
                totalBonuses += (v.bonusTotal || 0);
            });
            totalParking = Array.from(externalParkingByDay.values()).reduce((s, v) => s + v, 0);

            return {
                driverId: driver._id,
                name: driver.name,
                mobile: driver.mobile,
                totalEarned: totalCalculatedEarnings,
                totalWages,
                totalBonus: totalBonuses,
                totalParking,
                totalAdvances: totalAdvancesThisMonth,
                totalRecovered: totalRecoveredThisMonth,
                pendingAdvance,
                netPayable: totalCalculatedEarnings - totalAdvancesThisMonth,
                workingDays: datesProcessed.size,
                nightStayCount: Array.from(dailyAggs.values()).reduce((sum, v) => sum + v.nights, 0),
                sameDayCount: Array.from(dailyAggs.values()).reduce((sum, v) => sum + v.sameDays, 0),
                dailyWage: driver.dailyWage || 0
            };
        } catch (err) {
            console.error(`[getDriverSalarySummaryInternal] Error summarizing driver ${driver._id}:`, err);
            return null;
        }
    }).filter(s => s !== null);

    return summaries.filter(s => s.workingDays > 0 || s.totalAdvances > 0);
};

// @desc    Get Salary Summary for all drivers in a company
// @route   GET /api/admin/salary-summary/:companyId
// @access  Private/Admin
const getDriverSalarySummary = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { month, year, isFreelancer } = req.query;

    const validSummaries = await getDriverSalarySummaryInternal(companyId, month, year, isFreelancer === 'true');
    res.json(validSummaries);
});

// @desc    Get all executive users
// @route   GET /api/admin/executives
// @access  Private/Admin
const getAllExecutives = asyncHandler(async (req, res) => {
    const executives = await User.find({ role: 'Executive' }).select('-password');
    res.json(executives);
});

// @desc    Create a new executive user
// @route   POST /api/admin/executives
// @access  Private/Admin
const createExecutive = asyncHandler(async (req, res) => {
    const { name, mobile, username, password, permissions } = req.body;
    console.log('RECREATING EXECUTIVE ATTEMPT:', { name, mobile, username });

    if (!name || !mobile || !password || !username) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check for existing user by mobile or username
    const userExists = await User.findOne({
        $or: [
            { mobile: mobile, isFreelancer: { $ne: true } },
            { username: { $regex: new RegExp(`^${username.trim()}$`, 'i') } }
        ]
    });

    if (userExists) {
        console.log('EXECUTIVE CREATION FAILED: User already exists', { mobile, username });
        const msg = userExists.mobile === mobile
            ? 'User already exists with this mobile number'
            : 'User already exists with this username';
        return res.status(400).json({ message: msg });
    }

    try {
        // Create user instance explicitly to ensure pre-save hooks (hashing) run
        const executive = new User({
            name,
            mobile,
            username,
            password,
            role: 'Executive',
            status: 'active',
            isFreelancer: false,
            permissions: permissions || {
                driversService: false,
                buySell: false,
                vehiclesManagement: false,
                reports: true
            }
        });

        await executive.save();

        console.log('EXECUTIVE CREATED SUCCESSFULLY:', executive._id);

        res.status(201).json(executive);
    } catch (error) {
        console.error('Error creating executive:', error);
        res.status(500).json({ message: 'Server error while creating admin', error: error.message });
    }
});

// @desc    Update an executive user permissions
// @route   PUT /api/admin/executives/:id
// @access  Private/Admin
const updateExecutive = asyncHandler(async (req, res) => {
    const { name, mobile, username, password, permissions, status } = req.body;
    const executive = await User.findById(req.params.id);

    if (executive && executive.role === 'Executive') {
        executive.name = name || executive.name;
        executive.mobile = mobile || executive.mobile;
        executive.username = username || executive.username;
        executive.status = status || executive.status;

        if (permissions) {
            executive.permissions = { ...executive.permissions, ...permissions };
        }

        if (password) {
            executive.password = password;
        }

        const updatedUser = await executive.save();
        // Clear dashboard cache on mutation
        DASHBOARD_CACHE.clear();
        res.json(updatedUser);
    } else {
        res.status(404).json({ message: 'Executive user not found' });
    }
});

// @desc    Delete an executive user
// @route   DELETE /api/admin/executives/:id
// @access  Private/Admin
const deleteExecutive = asyncHandler(async (req, res) => {
    const executive = await User.findById(req.params.id);
    if (executive && executive.role === 'Executive') {
        await User.deleteOne({ _id: executive._id });
        res.json({ message: 'Executive user removed' });
    } else {
        res.status(404).json({ message: 'Executive user not found' });
    }
});

// @desc    Add a parking entry (Manual Admin Entry)
// @route   POST /api/admin/parking
// @access  Private/AdminOrExecutive
const addParkingEntry = asyncHandler(async (req, res) => {
    const { vehicleId, companyId, driver, date, amount, location, remark, receiptPhoto, driverId } = req.body;

    // If driverId is provided, get driver name and assigned vehicle if needed
    let driverName = driver;
    let actualVehicleId = vehicleId;

    if (driverId) {
        const driverDoc = await User.findById(driverId);
        if (driverDoc) {
            driverName = driverDoc.name;
            if (!actualVehicleId && driverDoc.assignedVehicle) {
                actualVehicleId = driverDoc.assignedVehicle;
            }
        }
    }

    const parking = await Parking.create({
        vehicle: actualVehicleId,
        company: companyId,
        driver: driverName,
        driverId: driverId,
        date: date || new Date(),
        amount: Number(amount),
        location: location || 'Not Specified',
        remark,
        source: 'Admin',
        receiptPhoto,
        createdBy: req.user._id
    });

    res.status(201).json(parking);
});

// @desc    Get all parking entries for a company (excludes Car Wash/Puncture)
// @route   GET /api/admin/parking/:companyId
// @access  Private/AdminOrExecutive
const getParkingEntries = asyncHandler(async (req, res) => {
    const { date, from, to } = req.query;
    let query = {
        company: req.params.companyId,
        // Only return regular parking (not car wash/puncture)
        $or: [{ serviceType: 'parking' }, { serviceType: { $exists: false } }, { serviceType: null }]
    };

    if (from && to) {
        query.date = {
            $gte: new Date(from),
            $lte: new Date(new Date(to).setHours(23, 59, 59, 999))
        };
    } else if (date) {
        const targetDate = new Date(date);
        query.date = {
            $gte: targetDate,
            $lte: new Date(new Date(targetDate).setHours(23, 59, 59, 999))
        };
    }

    const parking = await Parking.find(query)
        .populate('vehicle', 'carNumber model')
        .populate('driverId', 'name mobile isFreelancer')
        .sort({ date: -1 });
    res.json(parking);
});

// @desc    Get all car service entries (Car Wash, Puncture) for a company
// @route   GET /api/admin/car-services/:companyId
// @access  Private/AdminOrExecutive
const getCarServiceEntries = asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    let query = {
        company: req.params.companyId,
        serviceType: 'car_service'
    };

    if (from && to) {
        query.date = {
            $gte: new Date(from),
            $lte: new Date(new Date(to).setHours(23, 59, 59, 999))
        };
    }

    const entries = await Parking.find(query)
        .populate('vehicle', 'carNumber model')
        .populate('driverId', 'name mobile isFreelancer')
        .sort({ date: -1 });
    res.json(entries);
});

// @desc    Update a parking entry
// @route   PUT /api/admin/parking/:id
// @access  Private/AdminOrExecutive
const updateParkingEntry = asyncHandler(async (req, res) => {
    const { vehicleId, driverId, driver, date, amount, location, remark, receiptPhoto } = req.body;
    const parking = await Parking.findById(req.params.id);

    if (parking) {
        if (vehicleId) parking.vehicle = vehicleId;
        if (driverId) parking.driverId = driverId;
        if (driver) parking.driver = driver;
        if (date) parking.date = date;
        if (amount) parking.amount = Number(amount);
        if (location) parking.location = location;
        if (remark !== undefined) parking.remark = remark;
        if (receiptPhoto !== undefined) parking.receiptPhoto = receiptPhoto;

        const updatedParking = await parking.save();
        res.json(updatedParking);
    } else {
        res.status(404);
        throw new Error('Parking record not found');
    }
});

// @desc    Delete a parking entry
// @route   DELETE /api/admin/parking/:id
// @access  Private/AdminOrExecutive
const deleteParkingEntry = asyncHandler(async (req, res) => {
    await Parking.findByIdAndDelete(req.params.id);
    res.json({ message: 'Parking record removed' });
});

// --- STAFF MANAGEMENT ---

// @desc    Get all staff for a company
// @route   GET /api/admin/staff/:companyId
// @access  Private/Admin
const getAllStaff = asyncHandler(async (req, res) => {
    const { DateTime } = require('luxon');
    const staff = await User.find({ company: req.params.companyId, role: 'Staff' })
        .select('-password')
        .sort({ name: 1 });

    // For better UI, we'll calculate current month stats for each staff member
    const now = DateTime.now().setZone('Asia/Kolkata');
    const enhancedStaff = await Promise.all(staff.map(async (s) => {
        const staffObj = s.toObject();

        // Calculate current cycle dates
        const joiningDate = s.joiningDate || s.createdAt;
        const cycleStartDay = new Date(joiningDate).getDate();

        let start = now.set({ day: cycleStartDay }).startOf('day');
        if (now.day < cycleStartDay) {
            start = start.minus({ months: 1 });
        }
        const end = start.plus({ months: 1 }).minus({ days: 1 }).endOf('day');

        // StaffAttendance uses YYYY-MM-DD strings for 'date'
        const attendanceRecords = await StaffAttendance.find({
            staff: s._id,
            date: {
                $gte: start.toFormat('yyyy-MM-dd'),
                $lte: end.toFormat('yyyy-MM-dd')
            },
            status: { $in: ['present', 'half-day'] }
        });

        const effectivePresent = attendanceRecords.reduce((acc, rec) => {
            return acc + (rec.status === 'half-day' ? 0.5 : 1);
        }, 0);

        // Calculate working days passed so far in this cycle
        let workingDaysPassed = 0;
        let d = start;
        const effectiveEnd = end > now ? now : end;
        while (d <= effectiveEnd) {
            // For Hotel staff, Sundays are working days. For Company staff, they are off.
            if (s.staffType === 'Hotel' || d.weekday !== 7) {
                workingDaysPassed++;
            }
            d = d.plus({ days: 1 });
        }

        const totalAbsences = Math.max(0, workingDaysPassed - effectivePresent);
        const allowance = s.monthlyLeaveAllowance || 4;
        const paidLeavesUsed = Math.min(totalAbsences, allowance);
        const perDaySalary = (s.salary || 0) / 30; // Dividing by 30 for day-wise hisab
        const earnedSalary = (effectivePresent + paidLeavesUsed) * perDaySalary;

        staffObj.currentCycle = {
            presentDays: effectivePresent,
            earnedSalary: Math.round(earnedSalary),
            startDate: start.toFormat('dd MMM'),
            endDate: end.toFormat('dd MMM'),
            cycleDay: cycleStartDay
        };

        return staffObj;
    }));

    res.json(enhancedStaff);
});

// @desc    Create a new staff member
// @route   POST /api/admin/staff
// @access  Private/AdminOrExecutive
const createStaff = asyncHandler(async (req, res) => {
    const { name, mobile, password, companyId, salary, username } = req.body;

    const userExists = await User.findOne({
        $or: [
            { mobile, isFreelancer: { $ne: true } },
            ...(username ? [{ username }] : [])
        ]
    });
    if (userExists) {
        return res.status(400).json({ message: 'Staff with this mobile or username already exists' });
    }

    const staff = await User.create({
        name,
        mobile,
        password,
        company: companyId,
        salary: Number(salary),
        username,
        role: 'Staff',
        monthlyLeaveAllowance: Number(req.body.monthlyLeaveAllowance) || 4,
        email: req.body.email,
        designation: req.body.designation,
        shiftTiming: req.body.shiftTiming || { start: '09:00', end: '18:00' },
        officeLocation: req.body.officeLocation ? {
            latitude: req.body.officeLocation.latitude || undefined,
            longitude: req.body.officeLocation.longitude || undefined,
            address: req.body.officeLocation.address || '',
            radius: Number(req.body.officeLocation.radius) || 200
        } : undefined,
        profilePhoto: req.body.profilePhoto,
        joiningDate: req.body.joiningDate ? new Date(req.body.joiningDate) : new Date(),
        staffType: req.body.staffType || 'Company'
    });

    res.status(201).json(staff);
});

// @desc    Update a staff member
// @route   PUT /api/admin/staff/:id
// @access  Private/AdminOrExecutive
const updateStaff = asyncHandler(async (req, res) => {
    const { name, mobile, salary, status, monthlyLeaveAllowance, username, password } = req.body;
    const staff = await User.findById(req.params.id);

    if (staff && staff.role === 'Staff') {
        if (mobile && mobile !== staff.mobile) {
            const mobileExists = await User.findOne({ mobile, isFreelancer: { $ne: true } });
            if (mobileExists) return res.status(400).json({ message: 'Mobile number already in use by another staff/driver' });
            staff.mobile = mobile;
        }

        if (username !== undefined && username !== staff.username) {
            if (username === "") {
                staff.username = undefined;
            } else {
                const usernameExists = await User.findOne({ username });
                if (usernameExists) return res.status(400).json({ message: 'Username already in use' });
                staff.username = username;
            }
        }

        staff.name = name || staff.name;
        staff.salary = salary ? Number(salary) : staff.salary;
        staff.status = status || staff.status;
        staff.monthlyLeaveAllowance = monthlyLeaveAllowance || staff.monthlyLeaveAllowance;
        if (password) staff.password = password;

        // New fields
        if (req.body.email) staff.email = req.body.email;
        if (req.body.designation) staff.designation = req.body.designation;
        if (req.body.shiftTiming) staff.shiftTiming = req.body.shiftTiming;
        if (req.body.officeLocation) {
            staff.officeLocation = {
                latitude: req.body.officeLocation.latitude || undefined,
                longitude: req.body.officeLocation.longitude || undefined,
                address: req.body.officeLocation.address || '',
                radius: Number(req.body.officeLocation.radius) || 200
            };
        }
        if (req.body.profilePhoto) staff.profilePhoto = req.body.profilePhoto;
        if (req.body.joiningDate) staff.joiningDate = new Date(req.body.joiningDate);
        if (req.body.staffType) staff.staffType = req.body.staffType;

        const updatedStaff = await staff.save();
        res.json(updatedStaff);
    } else {
        res.status(404).json({ message: 'Staff member not found' });
    }
});

// @desc    Delete a staff member
// @route   DELETE /api/admin/staff/:id
// @access  Private/Admin
const deleteStaff = asyncHandler(async (req, res) => {
    const staff = await User.findById(req.params.id);

    if (staff && staff.role === 'Staff') {
        await staff.deleteOne();
        res.json({ message: 'Staff member removed' });
    } else {
        res.status(404).json({ message: 'Staff member not found' });
    }
});

// @desc    Add backdated attendance for staff (admin only)
// @route   POST /api/admin/staff-attendance/backdate
// @access  Private/AdminOrExecutive
const addBackdatedAttendance = asyncHandler(async (req, res) => {
    const { staffId, companyId, date, status, punchInTime, punchOutTime } = req.body;

    if (!staffId || !companyId || !date) {
        return res.status(400).json({ message: 'staffId, companyId, and date are required' });
    }

    // Restriction: Cannot backdate more than 60 days (2 months)
    const targetDate = DateTime.fromISO(date, { zone: 'Asia/Kolkata' });
    const sixtyDaysAgo = DateTime.now().setZone('Asia/Kolkata').minus({ days: 60 }).startOf('day');

    if (targetDate < sixtyDaysAgo) {
        return res.status(400).json({ message: 'Attendance entry is restricted to the last 60 days (2 months) only.' });
    }

    // Check if attendance already exists for this day
    const existing = await StaffAttendance.findOne({ staff: staffId, date });
    if (existing) {
        existing.status = status || existing.status;
        if (punchInTime) existing.punchIn = { time: new Date(`${date}T${punchInTime}:00`), location: { address: 'Admin Updated' } };
        if (punchOutTime) existing.punchOut = { time: new Date(`${date}T${punchOutTime}:00`), location: { address: 'Admin Updated' } };
        await existing.save();
        return res.json({ message: 'Attendance updated successfully', attendance: existing });
    }

    const attendance = await StaffAttendance.create({
        staff: staffId,
        company: companyId,
        date,
        status: status || 'present',
        punchIn: {
            time: punchInTime ? new Date(`${date}T${punchInTime}:00`) : new Date(`${date}T09:00:00`),
            location: { address: 'Admin Added' }
        },
        punchOut: punchOutTime
            ? { time: new Date(`${date}T${punchOutTime}:00`), location: { address: 'Admin Added' } }
            : undefined
    });

    res.status(201).json({ message: 'Backdated attendance added successfully', attendance });
});

// @desc    Get Staff Attendance Reports
// @route   GET /api/admin/staff-attendance/:companyId
// @access  Private/AdminOrExecutive
const getStaffAttendanceReports = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { from, to } = req.query;

    const query = { company: companyId };
    if (from && to) {
        query.date = { $gte: from, $lte: to };
    }

    const attendance = await StaffAttendance.find(query)
        .populate('staff', 'name mobile salary monthlyLeaveAllowance')
        .sort({ date: -1 });

    // If month/year provided, calculate summary
    const { month, year } = req.query;
    if (month && year) {
        const reqMonth = parseInt(month, 10);
        const reqYear = parseInt(year, 10);

        // Fetch 2 months of data to ensure we hit all variations of cycle starts and ends
        const searchStartDT = DateTime.fromObject({ year: reqYear, month: reqMonth, day: 1 }).minus({ days: 31 });
        const searchEndDT = DateTime.fromObject({ year: reqYear, month: reqMonth, day: 1 }).plus({ months: 2 });
        const startStrQuery = searchStartDT.toFormat('yyyy-MM-dd');
        const endStrQuery = searchEndDT.toFormat('yyyy-MM-dd');

        const rangeAttendance = await StaffAttendance.find({
            company: companyId,
            date: { $gte: startStrQuery, $lte: endStrQuery }
        });

        const allStaff = await User.find({ company: companyId, role: 'Staff' });
        const allApprovedLeaves = await LeaveRequest.find({ company: companyId, status: 'Approved' });
        const now = DateTime.now().setZone('Asia/Kolkata');
        const todayStr = now.toFormat('yyyy-MM-dd');

        const report = allStaff.map(s => {
            const joiningDate = s.joiningDate ? new Date(s.joiningDate) : new Date(s.createdAt);
            const joinDay = DateTime.fromJSDate(joiningDate).setZone('Asia/Kolkata').day;

            // Cycle for the requested month starts in that month on the joinDay
            // E.g. req=Feb, join=5th => cycle is Feb 5 to Mar 4
            let cycleStartDT = DateTime.fromObject({ year: reqYear, month: reqMonth, day: joinDay }, { zone: 'Asia/Kolkata' });

            // VALIDATION: If the joinDay is 31 but requested month only has 28 days, luxon pushes it to Mar 3rd.
            if (cycleStartDT.month !== reqMonth) {
                cycleStartDT = cycleStartDT.set({ day: 0 }); // last day of reqMonth
            }

            // DYNAMIC CYCLE SHIFT: If we are in the requested month but the joinDay hasn't arrived yet, 
            // the active cycle is actually the one that started in the previous month.
            const isCurrentMonth = reqMonth === now.month && reqYear === now.year;
            if (isCurrentMonth && now.day < joinDay) {
                cycleStartDT = cycleStartDT.minus({ months: 1 });
                // Re-clamp for the previous month
                if (cycleStartDT.day !== joinDay && cycleStartDT.plus({ days: 1 }).day === 1) {
                    // It was clamped or should be clamped
                }
            }

            const cycleEndDT = cycleStartDT.plus({ months: 1 }).minus({ days: 1 });
            const cycleStart = cycleStartDT.toFormat('yyyy-MM-dd');
            const cycleEnd = cycleEndDT.toFormat('yyyy-MM-dd');

            const effectiveEnd = cycleEnd > todayStr ? todayStr : cycleEnd;

            // Filter specific to this staff's cycle
            const staffAtt = rangeAttendance.filter(a =>
                String(a.staff) === String(s._id) &&
                a.date >= cycleStart &&
                a.date <= effectiveEnd
            );

            // Calculations
            let workingDaysPassed = 0;
            let sundaysPassed = 0;
            let d = cycleStartDT;
            const eDT = DateTime.fromISO(effectiveEnd);

            while (d <= eDT) {
                if (s.staffType === 'Hotel') {
                    workingDaysPassed++;
                } else {
                    if (d.weekday === 7) sundaysPassed++;
                    else workingDaysPassed++;
                }
                d = d.plus({ days: 1 });
            }

            const presentDays = staffAtt.filter(a => a.status === 'present').length;
            const halfDays = staffAtt.filter(a => a.status === 'half-day').length;
            const effectivePresent = presentDays + (halfDays * 0.5);

            // Sundays worked
            let sundaysWorked = 0;
            let regularEffectivePresent = 0;

            if (s.staffType === 'Hotel') {
                regularEffectivePresent = effectivePresent;
            } else {
                sundaysWorked = staffAtt.filter(a => {
                    return DateTime.fromISO(a.date).weekday === 7 && a.status === 'present';
                }).length;

                const regularPresents = staffAtt.filter(a => DateTime.fromISO(a.date).weekday !== 7);
                regularEffectivePresent = regularPresents.filter(a => a.status === 'present').length + (regularPresents.filter(a => a.status === 'half-day').length * 0.5);
            }

            const totalAbsences = Math.max(0, workingDaysPassed - regularEffectivePresent);

            // VERIFIED LEAVE LOGIC: Only count absences as 'paid' if there is an approved LeaveRequest for that day
            const myLeaves = allApprovedLeaves.filter(l => String(l.staff) === String(s._id));
            let verifiedPaidLeaves = 0;

            // We check each day in the cycle for an approved leave
            let cursor = cycleStartDT;
            const allowance = s.monthlyLeaveAllowance || 4; // Default 4 days

            while (cursor <= eDT && verifiedPaidLeaves < allowance) {
                const cStr = cursor.toFormat('yyyy-MM-dd');
                const attRec = staffAtt.find(a => a.date === cStr);

                // Absence = No record OR record marked as 'absent'
                const isAbsence = !attRec || attRec.status === 'absent';
                const isWorkDay = s.staffType === 'Hotel' || cursor.weekday !== 7;

                if (isAbsence && isWorkDay) {
                    const hasApprovedLeave = myLeaves.find(l => cStr >= l.startDate && cStr <= l.endDate);
                    if (hasApprovedLeave) {
                        verifiedPaidLeaves++;
                    }
                }
                cursor = cursor.plus({ days: 1 });
            }

            const paidLeavesUsed = verifiedPaidLeaves;
            const extraLeaves = Math.max(0, totalAbsences - paidLeavesUsed);

            const baseSalary = s.salary || 0;
            const perDaySalary = baseSalary / 30; // 30 day basis

            // Positive Accrual Logic: Salary = (Actual Progress + Paid Buffer Days) * Rate
            const finalSalary = (regularEffectivePresent + paidLeavesUsed + sundaysWorked) * perDaySalary;

            // Cycle Metadata for UI Heatmap
            const fullCycleAttendance = [];
            let tempDate = cycleStartDT;
            while (tempDate <= cycleEndDT) {
                const dateStr = tempDate.toFormat('yyyy-MM-dd');
                const exist = staffAtt.find(a => a.date === dateStr);
                const isSunday = tempDate.weekday === 7;

                fullCycleAttendance.push({
                    date: dateStr,
                    day: tempDate.day,
                    status: exist ? exist.status : (dateStr > todayStr ? 'upcoming' : 'absent'),
                    isSunday,
                    punchIn: exist?.punchIn,
                    punchOut: exist?.punchOut,
                    _id: exist?._id || `empty-${dateStr}`
                });
                tempDate = tempDate.plus({ days: 1 });
            }

            return {
                staffId: s._id,
                name: s.name,
                designation: s.designation,
                salary: baseSalary,
                presentDays: effectivePresent,
                sundaysWorked,
                totalDaysPassed: workingDaysPassed + sundaysPassed,
                workingDaysPassed,
                sundaysPassed,
                leavesTaken: totalAbsences,
                allowance,
                paidLeavesUsed,
                extraLeaves,
                perDaySalary: Math.round(perDaySalary),
                deduction: Math.round(extraLeaves * perDaySalary),
                sundayBonus: Math.round(sundaysWorked * perDaySalary),
                attendanceData: fullCycleAttendance, // Now returns full cycle for UI
                finalSalary: Math.round(finalSalary),
                cycleStart,
                cycleEnd,
                joiningDate: s.joiningDate
            };
        });

        return res.json({ attendance, report });
    }

    res.json(attendance);
});

// @desc    Get pending leave requests
// @route   GET /api/admin/leaves/pending/:companyId
// @access  Private/AdminOrExecutive
const getPendingLeaveRequests = asyncHandler(async (req, res) => {
    const leaves = await LeaveRequest.find({ company: req.params.companyId, status: 'Pending' })
        .populate('staff', 'name mobile');
    res.json(leaves);
});

// @desc    Approve or Reject leave request
// @route   PATCH /api/admin/leaves/:id
// @access  Private/AdminOrExecutive
const approveRejectLeave = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const leave = await LeaveRequest.findById(req.params.id);

    if (leave) {
        leave.status = status;
        leave.approvedAt = new Date();
        leave.approvedBy = req.user._id;
        await leave.save();

        // If approved, create entry in StaffAttendance as 'absent' to block punch-in
        if (status === 'Approved') {
            // Helper to generate dates between startDate and endDate
            const getDatesInRange = (start, end) => {
                const dates = [];
                let curr = DateTime.fromFormat(start, 'yyyy-MM-dd');
                const last = DateTime.fromFormat(end, 'yyyy-MM-dd');
                while (curr <= last) {
                    dates.push(curr.toFormat('yyyy-MM-dd'));
                    curr = curr.plus({ days: 1 });
                }
                return dates;
            };

            const dates = getDatesInRange(leave.startDate, leave.endDate);
            for (const date of dates) {
                try {
                    await StaffAttendance.findOneAndUpdate(
                        { staff: leave.staff, date },
                        { status: 'absent', company: leave.company },
                        { upsert: true }
                    );
                } catch (err) {
                    console.log(`Entry for ${date} already exists or error:`, err.message);
                }
            }
        }

        res.json(leave);
    } else {
        res.status(404).json({ message: 'Leave request not found' });
    }
});

// @desc    Add Accident/Incident Log
// @route   POST /api/admin/accident-logs
// @access  Private/Admin
const addAccidentLog = asyncHandler(async (req, res) => {
    const { vehicleId, driverId, companyId, date, amount, description, location, status } = req.body;

    const logData = {
        vehicle: vehicleId,
        driver: driverId,
        company: companyId,
        date,
        amount: amount || 0,
        description,
        location,
        status: status || 'Pending',
        createdBy: req.user._id
    };

    if (req.files && req.files.length > 0) {
        logData.photos = req.files.map(file => file.path);
    }

    const log = await AccidentLog.create(logData);
    res.status(201).json(log);
});

// @desc    Get Accident Logs for a company
// @route   GET /api/admin/accident-logs/:companyId
// @access  Private/AdminOrExecutive
const getAccidentLogs = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { from, to } = req.query;

    const query = { company: companyId };
    if (from && to) {
        query.date = { $gte: from, $lte: to };
    }

    const logs = await AccidentLog.find(query)
        .populate('vehicle', 'carNumber model')
        .populate('driver', 'name mobile')
        .sort({ date: -1 });

    res.json(logs);
});

// @desc    Delete Accident Log
// @route   DELETE /api/admin/accident-logs/:id
// @access  Private/Admin
const deleteAccidentLog = asyncHandler(async (req, res) => {
    const log = await AccidentLog.findById(req.params.id);
    if (log) {
        await log.deleteOne();
        res.json({ message: 'Log removed successfully' });
    } else {
        res.status(404).json({ message: 'Log not found' });
    }
});

// @desc    Update attendance (Active Log)
// @route   PUT /api/admin/attendance/:id
// @access  Private/Admin
const updateAttendance = asyncHandler(async (req, res) => {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
        res.status(404);
        throw new Error('Attendance record not found');
    }

    const {
        vehicleId,
        driverId,
        date,
        status,
        remarks,
        pickUpLocation,
        dropLocation,
        dailyWage,
        fuelAmount,
        parkingAmount,
        allowanceTA,
        nightStayAmount,
        bonusAmount,
        parkingPaidBy,
        startKm,
        endKm,
        punchInTime,
        punchOutTime
    } = req.body;

    console.log(`[ATTENDANCE_UPDATE] Updating ID: ${req.params.id}`, { parkingAmount, parkingPaidBy, dailyWage, startKm, endKm });

    if (!attendance.punchIn) attendance.punchIn = {};
    if (!attendance.punchOut) attendance.punchOut = { tollParkingAmount: 0, parkingPaidBy: 'Self' };
    if (!attendance.fuel) attendance.fuel = { filled: false, amount: 0, entries: [] };
    if (!attendance.outsideTrip) attendance.outsideTrip = { occurred: false, bonusAmount: 0 };

    const oldStatus = attendance.status;
    const oldVehicleId = attendance.vehicle?.toString();
    const oldDriverId = attendance.driver?.toString();
    const oldFuelAmount = attendance.fuel?.amount || 0;

    // 1. Basic Fields
    if (vehicleId) attendance.vehicle = vehicleId;
    if (driverId) attendance.driver = driverId;
    if (date) attendance.date = date;
    if (status) attendance.status = status;
    if (pickUpLocation !== undefined) attendance.pickUpLocation = pickUpLocation;
    if (dropLocation !== undefined) attendance.dropLocation = dropLocation;
    if (dailyWage !== undefined && dailyWage !== '') attendance.dailyWage = Number(dailyWage);
    if (req.body.eventId !== undefined) {
        attendance.eventId = req.body.eventId && req.body.eventId !== 'undefined' ? req.body.eventId : undefined;
    }

    // 2. Punch In Data (KMs & Time)
    if (!attendance.punchIn) attendance.punchIn = {};
    if (startKm !== undefined) {
        attendance.punchIn.km = Number(startKm) || 0;
        attendance.markModified('punchIn');
    }
    if (punchInTime !== undefined) {
        attendance.punchIn.time = punchInTime ? new Date(punchInTime) : undefined;
        attendance.markModified('punchIn');
    }

    // 3. Punch Out Data (KMs, Time, Expenses)
    if (!attendance.punchOut) attendance.punchOut = {};
    if (endKm !== undefined) {
        attendance.punchOut.km = Number(endKm) || 0;
        attendance.markModified('punchOut');
    }
    if (punchOutTime !== undefined) {
        attendance.punchOut.time = punchOutTime ? new Date(punchOutTime) : undefined;
        attendance.markModified('punchOut');
    }
    if (remarks !== undefined) {
        attendance.punchOut.remarks = remarks;
        attendance.punchOut.otherRemarks = remarks; // Manual entries use otherRemarks for the Review/Remark field
    }
    if (parkingAmount !== undefined) {
        const newParkingAmt = Number(parkingAmount) || 0;
        attendance.punchOut.tollParkingAmount = newParkingAmt;

        // Sync standalone Parking record
        // Search by attendanceId OR fallback to vehicle + date to catch unlinked records
        let existingParking = await Parking.findOne({ attendanceId: attendance._id });
        if (!existingParking && attendance.vehicle && attendance.date) {
            existingParking = await Parking.findOne({
                vehicle: attendance.vehicle,
                attendanceId: { $exists: false },
                date: {
                    $gte: new Date(`${attendance.date}T00:00:00`),
                    $lte: new Date(`${attendance.date}T23:59:59`)
                }
            });
        }

        if (newParkingAmt > 0) {
            if (existingParking) {
                existingParking.amount = newParkingAmt;
                existingParking.attendanceId = attendance._id; // Link it now
                existingParking.date = attendance.date ? new Date(attendance.date) : existingParking.date;
                await existingParking.save();
            } else {
                const driverDoc = await User.findById(attendance.driver);
                await Parking.create({
                    vehicle: attendance.vehicle,
                    company: attendance.company,
                    driver: driverDoc?.name || 'Unknown',
                    driverId: attendance.driver,
                    attendanceId: attendance._id,
                    date: attendance.date ? new Date(attendance.date) : new Date(),
                    amount: newParkingAmt,
                    source: 'Admin',
                    isReimbursable: attendance.punchOut.parkingPaidBy !== 'Office',
                    remark: 'Synced from Attendance Update'
                });
            }
        } else if (existingParking) {
            await existingParking.deleteOne();
        }
    }
    if (allowanceTA !== undefined) attendance.punchOut.allowanceTA = Number(allowanceTA) || 0;
    if (nightStayAmount !== undefined) attendance.punchOut.nightStayAmount = Number(nightStayAmount) || 0;
    if (parkingPaidBy !== undefined) attendance.punchOut.parkingPaidBy = parkingPaidBy;

    attendance.markModified('punchOut');

    // 4. Fuel Data
    if (fuelAmount !== undefined) {
        if (!attendance.fuel) attendance.fuel = { filled: false, entries: [], amount: 0 };
        const newFuelAmt = Number(fuelAmount) || 0;
        attendance.fuel.amount = newFuelAmt;
        attendance.fuel.filled = newFuelAmt > 0;
        attendance.markModified('fuel');

        // Sync standalone Fuel record if it exists or if new amount is > 0
        if (newFuelAmt !== oldFuelAmount) {
            const existingFuel = await Fuel.findOne({ attendance: attendance._id });
            if (newFuelAmt > 0) {
                if (existingFuel) {
                    existingFuel.amount = newFuelAmt;
                    existingFuel.rate = (existingFuel.quantity || 1) > 0 ? Number((newFuelAmt / (existingFuel.quantity || 1)).toFixed(2)) : 100; // Recalculate rate correctly
                    existingFuel.date = attendance.date ? new Date(attendance.date) : existingFuel.date;
                    await existingFuel.save();
                } else {
                    // Create new fuel if missing but amount > 0
                    const driverDoc = await User.findById(attendance.driver);
                    await Fuel.create({
                        vehicle: attendance.vehicle,
                        company: attendance.company,
                        fuelType: 'Diesel',
                        date: attendance.date ? new Date(attendance.date) : new Date(),
                        amount: newFuelAmt,
                        quantity: Number(newFuelAmt) / 100, // Estimate instead of 1L
                        rate: 100,
                        odometer: attendance.punchIn?.km || 0,
                        driver: driverDoc?.name || 'Unknown',
                        createdBy: req.user._id,
                        source: 'Admin',
                        attendance: attendance._id
                    });
                }
            } else if (existingFuel) {
                await existingFuel.deleteOne();
            }
        }
    }

    // 5. Bonus / Outside Trip
    if (bonusAmount !== undefined) {
        if (!attendance.outsideTrip) {
            attendance.outsideTrip = { occurred: true, tripType: 'Manual', bonusAmount: 0 };
        }
        attendance.outsideTrip.bonusAmount = Number(bonusAmount) || 0;
        attendance.outsideTrip.occurred = (Number(bonusAmount) || 0) > 0;
        attendance.markModified('outsideTrip');
    }

    // 6. Recalculate Totals
    if (attendance.punchIn?.km !== undefined && attendance.punchOut?.km !== undefined) {
        attendance.totalKM = Math.max(0, (Number(attendance.punchOut.km) || 0) - (Number(attendance.punchIn.km) || 0));
    }

    // Explicitly mark changed top-level fields
    attendance.markModified('dailyWage');
    attendance.markModified('pickUpLocation');
    attendance.markModified('dropLocation');
    attendance.markModified('date');
    attendance.markModified('status');

    const updatedAttendance = await attendance.save();

    // 7. Post-Save Sync Logic
    // Sync Parking Entry
    if (parkingAmount !== undefined) {
        const amt = Number(parkingAmount);
        const existingParking = await Parking.findOne({ attendanceId: attendance._id });

        if (amt > 0) {
            if (existingParking) {
                existingParking.amount = amt;
                existingParking.date = attendance.date ? new Date(attendance.date) : existingParking.date;
                existingParking.vehicle = attendance.vehicle || existingParking.vehicle;
                existingParking.isReimbursable = parkingPaidBy === 'Office' ? false : true;
                existingParking.notes = `Updated Attendance Parking (Paid By: ${parkingPaidBy || 'Unknown'})`;
                await existingParking.save();
            } else {
                const driverDoc = await User.findById(attendance.driver);
                await Parking.create({
                    vehicle: attendance.vehicle,
                    company: attendance.company,
                    driver: driverDoc?.name || 'Unknown',
                    driverId: attendance.driver,
                    attendanceId: attendance._id,
                    date: attendance.date ? new Date(attendance.date) : new Date(),
                    amount: amt,
                    source: 'Admin',
                    notes: `Updated Attendance Parking (Paid By: ${parkingPaidBy || 'Self'})`,
                    createdBy: req.user._id,
                    isReimbursable: parkingPaidBy === 'Office' ? false : true
                });
            }
        } else if (existingParking) {
            await existingParking.deleteOne();
        }
    }

    // Sync Odometer
    if (attendance.vehicle && (startKm !== undefined || endKm !== undefined || punchOutTime !== undefined)) {
        await syncVehicleOdometer(attendance.vehicle);
    }

    // Sync Driver & Vehicle status if status changed from incomplete to completed
    if (oldStatus === 'incomplete' && attendance.status === 'completed') {
        if (attendance.vehicle) {
            await Vehicle.findByIdAndUpdate(attendance.vehicle, { currentDriver: null });
        }
        if (attendance.driver) {
            await User.findByIdAndUpdate(attendance.driver, { tripStatus: 'approved', assignedVehicle: null });
        }
    }

    console.log(`[ATTENDANCE_UPDATE] SUCCESS. ID: ${updatedAttendance._id}, TotalKM: ${updatedAttendance.totalKM}, Wage: ${updatedAttendance.dailyWage}, Parking: ${updatedAttendance.punchOut?.tollParkingAmount}`);

    // Clear dashboard cache on mutation
    DASHBOARD_CACHE.clear();

    res.json(updatedAttendance);
});

// @desc    Get Detailed Salary Breakdown for a specific driver
// @route   GET /api/admin/salary-details/:driverId
// @access  Private/Admin
const getDriverSalaryDetails = asyncHandler(async (req, res) => {
    try {
        console.log('Fetching Salary Details:', req.params.driverId, req.query);
        const { driverId } = req.params;
        const { month, year, from, to } = req.query;

        if (!driverId) {
            res.status(400);
            throw new Error('Driver ID is missing');
        }

        let startDT, endDT, startStr, endStr, startOfMonth, endOfMonth;

        if (from && to) {
            startDT = DateTime.fromISO(from, { zone: 'Asia/Kolkata' }).startOf('day');
            endDT = DateTime.fromISO(to, { zone: 'Asia/Kolkata' }).endOf('day');

            if (!startDT.isValid || !endDT.isValid) {
                res.status(400);
                throw new Error('Invalid date range provided');
            }

            startStr = from;
            endStr = to;
            startOfMonth = startDT.toJSDate();
            endOfMonth = endDT.toJSDate();
        } else if (month && year) {
            startDT = DateTime.fromObject({ year: parseInt(year), month: parseInt(month), day: 1 }, { zone: 'Asia/Kolkata' }).startOf('month');
            endDT = startDT.endOf('month');

            if (!startDT.isValid) {
                res.status(400);
                throw new Error('Invalid month/year provided');
            }

            startStr = startDT.toFormat('yyyy-MM-dd');
            endStr = endDT.toFormat('yyyy-MM-dd');
            startOfMonth = startDT.toJSDate();
            endOfMonth = endDT.toJSDate();
        } else {
            res.status(400);
            throw new Error('Please provide a date range (from/to) or month/year');
        }

        // 1. Fetch Attendance
        const attendance = await Attendance.find({
            driver: driverId,
            status: 'completed',
            date: { $gte: startStr, $lte: endStr }
        }).populate('vehicle', 'carNumber').sort({ date: 1 });

        const driver = await User.findById(driverId).select('name mobile dailyWage');
        if (!driver) {
            res.status(404);
            throw new Error('Driver not found');
        }

        // 2. Fetch Parking Entries — sanitize name for regex safety
        const escapedName = driver.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parking = await Parking.find({
            $or: [
                { driverId: driverId },
                { driver: { $regex: new RegExp(`^${escapedName}$`, 'i') } }
            ],
            date: { $gte: startOfMonth, $lte: endOfMonth },
            serviceType: { $ne: 'car_service' },
            isReimbursable: { $ne: false }
        }).sort({ date: 1 });

        // 3. Fetch Advances
        const advances = await Advance.find({
            driver: driverId,
            date: { $gte: startOfMonth, $lte: endOfMonth },
            remark: { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ }
        });

        // Group external parking for logic
        const externalByDay = new Map();
        parking.forEach(p => {
            const dStr = DateTime.fromJSDate(p.date).setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
            externalByDay.set(dStr, (externalByDay.get(dStr) || 0) + (Number(p.amount) || 0));
        });

        // Group internal totals not needed anymore as we use Parking section only
        const internalByDay = new Map();

        // Track which date's wage and parking we have already distributed
        const wageUsed = new Set();
        const parkingUsed = new Set();

        const dailyBreakdown = attendance.map(att => {
            // Apply wage only ONCE per day (first duty of the day)
            let wage = 0;
            if (!wageUsed.has(att.date)) {
                wage = (Number(att.dailyWage) || 0) || (driver.dailyWage ? Number(driver.dailyWage) : 0) || (driver.salary ? Math.round(Number(driver.salary) / 26) : 0) || 0;
                wageUsed.add(att.date);
            }

            // Fetch bonuses for data completeness but exclude from 'total' if requested
            const sameDayReturn = Number(att.punchOut?.allowanceTA) || 0;
            const nightStay = Number(att.punchOut?.nightStayAmount) || 0;
            // bonusAmount in driverController is (allowanceTA + nightStay), so we subtract them to get "extra"
            const otherBonuses = Math.max(0, (Number(att.outsideTrip?.bonusAmount) || 0) - sameDayReturn - nightStay);

            // Use parking from official Parking collection only
            const totalExternalForDay = externalByDay.get(att.date) || 0;

            let finalParkingCell = 0;
            if (!parkingUsed.has(att.date)) {
                finalParkingCell = totalExternalForDay;
                parkingUsed.add(att.date);
            }
            const isManualEntry = att.punchOut?.remarks === 'Manual Entry';

            return {
                date: att.date,
                type: isManualEntry ? 'Manual Entry' : 'Duty',
                wage,
                sameDayReturn,
                nightStay,
                otherBonuses,
                parking: finalParkingCell,
                total: wage + finalParkingCell + sameDayReturn + nightStay + otherBonuses, // Include all bonuses in total
                vehicleId: att.vehicle?._id || att.vehicle,
                vehicleNumber: att.vehicle?.carNumber || 'N/A',
                totalKM: att.totalKM || 0,
                remarks: isManualEntry ? '' : (att.punchOut?.remarks || '')
            };
        });

        // Standalone parking (dates with NO attendance)
        const attendanceDates = new Set(attendance.map(a => a.date));
        const standaloneParkingEntries = parking.filter(p => {
            const d = DateTime.fromJSDate(p.date).setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
            return !attendanceDates.has(d);
        });

        // Aggregated totals - Including bonuses
        const totalWages = dailyBreakdown.reduce((sum, d) => sum + d.wage, 0);
        const totalBonuses = dailyBreakdown.reduce((sum, d) => sum + d.sameDayReturn + d.nightStay + d.otherBonuses, 0);
        const parkingTotal = dailyBreakdown.reduce((sum, d) => sum + d.parking, 0) +
            standaloneParkingEntries.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const totalAdvances = advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
        const grandTotal = totalWages + parkingTotal + totalBonuses;
        const netPayable = grandTotal - totalAdvances;

        res.json({
            vID: "WAGE_FIX_V2", // VERIFICATION TAG
            driver,
            breakdown: dailyBreakdown,
            advances,
            parkingEntries: parking,
            summary: {
                totalWages,
                parkingTotal,
                totalAdvances,
                grandTotal,
                netPayable,
                workingDays: attendanceDates.size
            }
        });
    } catch (error) {
        console.error('Error in getDriverSalaryDetails:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get monthly vehicle activity details
// @route   GET /api/admin/vehicle-monthly-details/:companyId
// @access  Private/AdminOrExecutive
const getVehicleMonthlyDetails = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
        return res.status(400).json({ message: 'Month and Year are required' });
    }

    const m = parseInt(month);
    const y = parseInt(year);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
    const monthStartStr = DateTime.fromJSDate(monthStart).setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
    const monthEndStr = DateTime.fromJSDate(monthEnd).setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');

    // 1. Get all fleet vehicles
    const vehicles = await Vehicle.find({
        company: companyId,
        isOutsideCar: { $ne: true }
    }).select('carNumber model');

    // 2. Fetch all related data for the month concurrently
    const [fuelData, maintenanceData, parkingData, attendanceData] = await Promise.all([
        Fuel.find({
            company: companyId,
            date: { $gte: monthStart, $lte: monthEnd }
        }),
        Maintenance.find({
            company: companyId,
            billDate: { $gte: monthStart, $lte: monthEnd }
        }),
        Parking.find({
            company: companyId,
            date: { $gte: monthStart, $lte: monthEnd },
            serviceType: 'car_service'
        }),
        Attendance.find({
            company: companyId,
            date: { $gte: monthStartStr, $lte: monthEndStr }
        }).populate('driver', 'name')
    ]);

    // 3. Process data per vehicle
    const vehicleDetails = vehicles.map(v => {
        const vId = v._id.toString();

        // Fuel
        const vFuel = fuelData.filter(f => f.vehicle?.toString() === vId);
        const totalFuelAmount = vFuel.reduce((sum, f) => sum + (f.amount || 0), 0);
        const totalFuelQuantity = vFuel.reduce((sum, f) => sum + (f.quantity || 0), 0);

        // Separate Maintenance records: General Maintenance vs Service Hub (Wash/Punc)
        const vMaintAll = maintenanceData.filter(m => m.vehicle?.toString() === vId);
        const serviceRegex = /wash|puncture|puncher|tissue|water|cleaning|mask|sanitizer/i;

        // General Maintenance (Repairs, Parts, etc. - NOT Car Service type and NO service keywords)
        const vGeneralMaint = vMaintAll.filter(m => {
            if (m.maintenanceType === 'Car Service') return false;
            const cat = String(m.category || '').toLowerCase();
            const desc = String(m.description || '').toLowerCase();
            const typeValue = String(m.maintenanceType || '').toLowerCase();
            return !serviceRegex.test(cat) && !serviceRegex.test(desc) && !serviceRegex.test(typeValue);
        });
        const totalMaintAmount = vGeneralMaint.reduce((sum, m) => sum + (m.amount || 0), 0);

        // Service Hub records from Maintenance (Type: 'Car Service' OR contains service keywords)
        const vMaintServices = vMaintAll.filter(m => {
            if (m.maintenanceType === 'Car Service') return true;
            const cat = String(m.category || '').toLowerCase();
            const desc = String(m.description || '').toLowerCase();
            const typeValue = String(m.maintenanceType || '').toLowerCase();
            return serviceRegex.test(cat) || serviceRegex.test(desc) || serviceRegex.test(typeValue);
        });

        // Service Hub records from Parking (serviceType: 'car_service')
        const vParkingServices = parkingData.filter(p => p.vehicle?.toString() === vId);

        let washCount = 0;
        let punctureCount = 0;
        let washAmount = 0;
        let punctureAmount = 0;
        let vServicesArray = { wash: [], puncture: [] };

        // Process all service hub candidates (Maintenance + Parking)
        const allCandidates = [
            ...vMaintServices.map(m => ({ ...m.toObject(), type: 'maint' })),
            ...vParkingServices.map(p => ({ ...p.toObject(), type: 'parking' }))
        ];

        allCandidates.forEach(s => {
            const category = (s.category || '').toLowerCase();
            const remark = (s.remark || '').toLowerCase();
            const description = (s.description || '').toLowerCase();
            const searchTarget = `${category} ${remark} ${description}`.toLowerCase();

            const date = s.billDate || s.date || s.createdAt;
            const amount = Number(s.amount) || 0;

            if (searchTarget.includes('puncture') || searchTarget.includes('puncher')) {
                punctureCount++;
                punctureAmount += amount;
                vServicesArray.puncture.push({ date, amount, id: s._id, source: s.type });
            } else {
                // Default everything else in 'Car Service' to Wash if not explicitly puncture
                washCount++;
                washAmount += amount;
                vServicesArray.wash.push({ date, amount, id: s._id, source: s.type });
            }
        });

        // Unique Drivers and Salary Breakdown
        const vAtt = attendanceData.filter(a => a.vehicle?.toString() === vId);
        const driversMap = new Map();
        let totalDriverSalary = 0;

        vAtt.forEach(a => {
            const driverName = a.driver?.name || 'Unknown';
            const wage = (a.dailyWage || 0) +
                (a.outsideTrip?.bonusAmount || 0) +
                (a.punchOut?.allowanceTA || 0) +
                (a.punchOut?.nightStayAmount || 0);

            if (driversMap.has(driverName)) {
                driversMap.set(driverName, driversMap.get(driverName) + wage);
            } else {
                driversMap.set(driverName, wage);
            }
            totalDriverSalary += wage;
        });

        return {
            vehicleId: vId,
            carNumber: v.carNumber,
            model: v.model,
            driverSalary: totalDriverSalary,
            drivers: Array.from(driversMap.keys()),
            driverBreakdown: Array.from(driversMap).map(([name, salary]) => ({ name, salary })),
            fuel: {
                totalAmount: totalFuelAmount,
                totalQuantity: totalFuelQuantity,
                count: vFuel.length,
                records: vFuel.map(f => ({ date: f.date, amount: f.amount, quantity: f.quantity, receipt: f.receiptNumber }))
            },
            maintenance: {
                totalAmount: totalMaintAmount,
                count: vGeneralMaint.length,
                records: vGeneralMaint.map(m => ({
                    type: m.maintenanceType,
                    category: m.category,
                    amount: m.amount,
                    date: m.billDate,
                    description: m.description
                }))
            },
            services: {
                wash: { count: washCount, amount: washAmount, records: vServicesArray.wash },
                puncture: { count: punctureCount, amount: punctureAmount, records: vServicesArray.puncture }
            }
        };
    });

    res.json(vehicleDetails);
});

// @desc    Add a pending fuel/parking expense (Admin side, requires approval)
// @route   POST /api/admin/expenses/pending
// @access  Private/AdminOrExecutive
const addPendingExpenseFromAdmin = asyncHandler(async (req, res) => {
    const { driverId, vehicleId, companyId, date, amount, quantity, rate, odometer, stationName, paymentMode, paymentSource, remark, type, fuelType, slipPhoto, location } = req.body;

    // Find or create an Attendance record for the given driver and date to attach this pending expense
    let attendance = await Attendance.findOne({
        driver: driverId,
        date: date
    }).sort({ createdAt: -1 });

    if (!attendance) {
        // Find driver info to get daily wage and company if not passed
        const driverRaw = await User.findById(driverId);

        attendance = await Attendance.create({
            driver: driverId,
            company: companyId || driverRaw.company,
            vehicle: vehicleId,
            date: date,
            status: 'completed', // prevent showing active shift
            dailyWage: driverRaw.dailyWage || 0,
            dutyCount: 0, // so it doesn't count as an extra duty
        });
    }

    attendance.pendingExpenses.push({
        type: type, // 'fuel' or 'parking'
        fuelType: fuelType || null,
        amount: Number(amount),
        quantity: quantity ? Number(quantity) : 0,
        rate: rate ? Number(rate) : 0,
        km: odometer ? Number(odometer) : 0,
        slipPhoto: slipPhoto || null,
        paymentSource: paymentSource || 'Yatree Office',
        status: 'pending'
    });

    await attendance.save();

    res.status(201).json({ message: 'Expense added as pending for approval', attendance });
});

// @desc    Get light-weight live stats for Live Feed page
// @route   GET /api/admin/live-feed/:companyId
// @access  Private/Admin+Executive
const getLiveFeed = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { date } = req.query;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
        res.status(400);
        throw new Error('Invalid Company ID');
    }

    const todayISTString = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
    const targetDate = date || todayISTString;
    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    const cacheKey = `livefeed_${companyId}_${targetDate}`;
    if (DASHBOARD_CACHE.has(cacheKey)) {
        const cached = DASHBOARD_CACHE.get(cacheKey);
        if (Date.now() - cached.time < 30 * 1000) { // 30s cache for live feed is fast but mostly up to date
            return res.json(cached.data);
        }
    }

    // Use proper Date range for Fuel collection since it stores Date objects
    const startDT = DateTime.fromISO(targetDate, { zone: 'Asia/Kolkata' }).startOf('day').toJSDate();
    const endDT = DateTime.fromISO(targetDate, { zone: 'Asia/Kolkata' }).endOf('day').toJSDate();

    const [attendanceToday, fuelEntriesToday, totalVehicles, liveDriversFeed, allVehicles] = await Promise.all([
        Attendance.find({ company: companyObjectId, date: targetDate }).populate('driver', 'name mobile isFreelancer salary dailyWage').populate('vehicle', 'carNumber model').lean(),
        Fuel.find({ company: companyObjectId, date: { $gte: startDT, $lte: endDT } }).populate('vehicle', 'carNumber').lean(),
        Vehicle.countDocuments({ company: companyObjectId, isOutsideCar: { $ne: true } }),
        User.find({ company: companyObjectId, role: 'Driver' }).select('name mobile isFreelancer salary dailyWage').lean(),
        Vehicle.find({ company: companyObjectId, isOutsideCar: { $ne: true } }).select('carNumber model').lean()
    ]);

    // Ensure all drivers with attendance today are in the feed, even if not in the default Driver list
    const driversInAttendance = attendanceToday
        .map(a => a.driver)
        .filter(d => d && !liveDriversFeed.some(df => df._id.toString() === d._id.toString()));

    const combinedDrivers = [...liveDriversFeed, ...driversInAttendance];

    const mappedDrivers = combinedDrivers.map(driver => {
        const atts = attendanceToday.filter(a => a.driver?._id?.toString() === driver._id.toString());
        let status = 'Absent';
        if (atts.some(a => a.status === 'incomplete')) status = 'Present';
        else if (atts.some(a => a.status === 'completed')) status = 'Completed';
        return { ...driver, attendances: atts, status };
    }).filter(driver => {
        // Only show freelancers if they have active or completed attendance for the target date
        if (driver.isFreelancer === true) {
            return driver.status !== 'Absent';
        }
        return true; // Always show regular drivers
    });

    const liveVehiclesFeed = allVehicles.map(v => {
        const vehicleAtts = attendanceToday.filter(a => a.vehicle?._id?.toString() === v._id.toString());
        const hasActive = vehicleAtts.some(a => a.status === 'incomplete');

        return {
            ...v,
            status: hasActive ? 'In Use' : 'Idle',
            attendances: vehicleAtts // Pass full attendance array for the UI to render driver names
        };
    });

    const finalResponse = {
        date: targetDate,
        totalVehicles,
        countPunchIns: attendanceToday.filter(a => a.punchIn?.time).length,
        dailyFuelAmount: { total: fuelEntriesToday.reduce((sum, f) => sum + (Number(f.amount) || 0), 0) },
        liveDriversFeed: mappedDrivers,
        liveVehiclesFeed,
        dailyFuelEntries: fuelEntriesToday,
        dutyHistoryThisMonth: attendanceToday,
        lastUpdated: new Date().toISOString()
    };

    DASHBOARD_CACHE.set(cacheKey, { data: finalResponse, time: Date.now() });
    res.json(finalResponse);
});

module.exports = {
    createDriver,
    createVehicle,
    assignVehicle,
    toggleDriverStatus,
    getDashboardStats,
    getAllDrivers,
    getAllVehicles,
    updateDriver,
    updateVehicle,
    deleteDriver,
    deleteVehicle,
    uploadVehicleDocument,
    uploadDriverDocument,
    verifyDriverDocument,
    getDailyReports,
    approveNewTrip,
    addBorderTax,
    getBorderTaxEntries,
    rechargeFastag,
    updateFastagRecharge,
    deleteFastagRecharge,
    freelancerPunchIn,
    freelancerPunchOut,
    deleteBorderTax,
    addMaintenanceRecord,
    getMaintenanceRecords,
    deleteMaintenanceRecord,
    addFuelEntry,
    getFuelEntries,
    updateFuelEntry,
    deleteFuelEntry,
    approveRejectExpense,
    getPendingFuelExpenses,
    addAdvance,
    getAdvances,
    deleteAdvance,
    updateAdvance,
    getDriverSalarySummary,
    getDriverSalaryDetails, // Export new function
    getAllExecutives,
    createExecutive,
    updateExecutive,
    deleteExecutive,
    addParkingEntry,
    getParkingEntries,
    getCarServiceEntries,
    deleteParkingEntry,
    updateParkingEntry,
    getPendingParkingExpenses,
    getAllStaff,
    createStaff,
    deleteStaff,
    updateStaff,
    getStaffAttendanceReports,
    getPendingLeaveRequests,
    approveRejectLeave,
    adminPunchIn,
    adminPunchOut,
    addManualDuty,
    deleteAttendance,
    updateAttendance,
    addAccidentLog,
    getAccidentLogs,
    deleteAccidentLog,
    updateMaintenanceRecord,
    getPendingMaintenanceExpenses,
    getVehicleMonthlyDetails,
    getLiveFeed,
    addBackdatedAttendance,
    deleteStaffAttendance,
    addPendingExpenseFromAdmin,
};
