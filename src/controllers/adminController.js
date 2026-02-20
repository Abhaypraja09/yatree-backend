const mongoose = require('mongoose');
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
const { DateTime } = require('luxon');
const asyncHandler = require('express-async-handler');

// @desc    Create a new driver
// @route   POST /api/admin/drivers
// @access  Private/Admin
// @access  Private/Admin
const createDriver = async (req, res, next) => {
    try {
        const { name, mobile, password, companyId, isFreelancer, licenseNumber, username, dailyWage, salary } = req.body;
        const freelancer = isFreelancer === 'true' || isFreelancer === true;

        if (!name || !mobile || (!freelancer && !password) || !companyId || companyId === 'undefined') {
            return res.status(400).json({ message: 'Please provide all required fields: name, mobile, password (for regular drivers), companyId' });
        }

        const userExists = await User.findOne({
            $or: [
                { mobile },
                ...(username ? [{ username }] : [])
            ]
        });
        if (userExists) {
            const field = userExists.mobile === mobile ? 'mobile number' : 'username';
            return res.status(400).json({ message: `Driver already exists with this ${field}` });
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
            salary: Number(salary) || 0
        });

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
    const { carNumber, model, permitType, companyId, carType, isOutsideCar, dutyAmount, fastagNumber, fastagBalance, fastagBank, driverName, dutyType, ownerName, dropLocation, property } = req.body;

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
        ownerName,
        dropLocation,
        property,
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

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard/:companyId
// @access  Private/Admin
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { date } = req.query; // Optional date query

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({ message: 'Invalid Company ID' });
    }

    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    // Default to today IST if no date provided
    const todayIST = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
    const targetDate = date || todayIST;

    const baseDate = DateTime.fromFormat(targetDate, 'yyyy-MM-dd').setZone('Asia/Kolkata').startOf('day');
    const alertThreshold = baseDate.plus({ days: 30 });
    const monthStart = baseDate.startOf('month').toJSDate();
    const monthEnd = baseDate.endOf('month').toJSDate();
    const monthStartStr = baseDate.startOf('month').toFormat('yyyy-MM-dd');
    const monthEndStr = baseDate.endOf('month').toFormat('yyyy-MM-dd');

    // Run independent heavy queries concurrently
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
        outsideCarsThisMonth // Outside cars for the entire month
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
            .populate('vehicle', 'carNumber'),
        User.countDocuments({
            company: companyObjectId,
            role: 'Driver',
            tripStatus: 'pending_approval'
        }),
        Vehicle.find({
            company: companyObjectId,
            isOutsideCar: { $ne: true },
            'documents.expiryDate': { $lte: alertThreshold.toJSDate() }
        }).select('carNumber documents'),
        User.find({
            company: companyObjectId,
            role: 'Driver',
            'documents.expiryDate': { $lte: alertThreshold.toJSDate() }
        }).select('name documents'),
        Vehicle.aggregate([
            {
                $match: { company: companyObjectId }
            },
            { $group: { _id: null, total: { $sum: '$fastagBalance' } } }
        ]),
        Advance.aggregate([ // advanceData (for non-freelancer total pending)
            {
                $lookup: {
                    from: 'users',
                    localField: 'driver',
                    foreignField: '_id',
                    as: 'driverInfo'
                }
            },
            { $unwind: { path: '$driverInfo', preserveNullAndEmptyArrays: false } },
            {
                $match: {
                    company: companyObjectId,
                    'driverInfo.isFreelancer': { $ne: true },
                    status: 'Pending',
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
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Maintenance.find({
            $and: [
                {
                    company: companyObjectId
                },
                {
                    $or: [
                        { nextServiceDate: { $lte: alertThreshold.toJSDate(), $gte: baseDate.minus({ days: 30 }).toJSDate() } },
                        { nextServiceKm: { $gt: 0 } }
                    ]
                }
            ],
            status: 'Completed'
        }).populate('vehicle', 'carNumber lastOdometer').sort({ createdAt: -1 }),
        User.countDocuments({
            company: companyObjectId,
            role: 'Staff'
        }),
        StaffAttendance.find({ // staffAttendanceToday
            company: companyObjectId,
            date: targetDate
        }).populate('staff', 'name mobile'),
        Advance.aggregate([ // freelancerAdvanceData
            {
                $lookup: {
                    from: 'users',
                    localField: 'driver',
                    foreignField: '_id',
                    as: 'driverInfo'
                }
            },
            { $unwind: { path: '$driverInfo', preserveNullAndEmptyArrays: false } },
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
        Advance.aggregate([ // dailyAdvanceData - Filter out auto-generated salary advances to avoid double counting with dailySalaryTotal
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
        Parking.aggregate([ // monthlyParkingData
            {
                $match: {
                    company: companyObjectId,
                    date: { $gte: monthStart, $lte: monthEnd }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Attendance.find({ // allAttendanceThisMonth
            company: companyObjectId,
            date: { $gte: monthStartStr, $lte: monthEndStr }
        }).populate('driver', 'name mobile salary dailyWage isFreelancer'),
        BorderTax.aggregate([ // monthlyBorderTaxData
            {
                $match: {
                    company: companyObjectId,
                    date: { $gte: monthStart, $lte: monthEnd }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Advance.find({ // regularAdvancesList
            company: companyObjectId,
            status: 'Pending',
            remark: { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ }
        }).populate({
            path: 'driver',
            match: { isFreelancer: { $ne: true } },
            select: 'name mobile'
        }).sort({ date: -1 }),
        Attendance.find({ // reportedIssuesList
            company: companyObjectId,
            'punchOut.otherRemarks': { $exists: true, $ne: '' }
        }).populate('driver', 'name').populate('vehicle', 'carNumber').sort({ createdAt: -1 }).limit(10),
        Vehicle.find({ // outsideCarsToday
            company: companyObjectId,
            isOutsideCar: true,
            createdAt: { $gte: baseDate.toJSDate(), $lte: baseDate.endOf('day').toJSDate() }
        }),
        AccidentLog.aggregate([
            {
                $match: {
                    company: companyObjectId
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        PartsWarranty.aggregate([
            {
                $match: {
                    company: companyObjectId
                }
            },
            { $group: { _id: null, total: { $sum: '$cost' } } }
        ]),
        Vehicle.find({ // outsideCarsThisMonth
            company: companyObjectId,
            isOutsideCar: true,
            createdAt: { $gte: monthStart, $lte: monthEnd }
        })
    ]);

    // Dashboard totals now reflect the Approved collections to match the logs.
    const filteredAttendance = attendanceToday.filter(a => a.driver && !a.driver.isFreelancer);

    const expiringAlerts = [];
    vehiclesWithExpiringDocs.forEach(v => {
        v.documents.forEach(doc => {
            if (doc.expiryDate) {
                const expiry = DateTime.fromJSDate(doc.expiryDate).setZone('Asia/Kolkata').startOf('day');
                if (expiry <= alertThreshold) {
                    const diffDays = Math.ceil(expiry.diff(baseDate, 'days').days);
                    expiringAlerts.push({
                        type: 'Vehicle',
                        identifier: v.carNumber,
                        documentType: doc.documentType,
                        expiryDate: doc.expiryDate,
                        daysLeft: diffDays,
                        status: diffDays < 0 ? 'Expired' : 'Expiring Soon'
                    });
                }
            }
        });
    });

    driversWithExpiringDocs.forEach(d => {
        d.documents.forEach(doc => {
            if (doc.expiryDate) {
                const expiry = DateTime.fromJSDate(doc.expiryDate).setZone('Asia/Kolkata').startOf('day');
                if (expiry <= alertThreshold) {
                    const diffDays = Math.ceil(expiry.diff(baseDate, 'days').days);
                    expiringAlerts.push({
                        type: 'Driver',
                        identifier: d.name,
                        documentType: doc.documentType,
                        expiryDate: doc.expiryDate,
                        daysLeft: diffDays,
                        status: diffDays < 0 ? 'Expired' : 'Expiring Soon'
                    });
                }
            }
        });
    });

    // Track which vehicles we've already added KM alerts for (to show only the latest)
    const kmAlertedVehicles = new Set();

    upcomingServices.forEach(s => {
        // Date based alerts
        if (s.nextServiceDate) {
            const serviceDate = DateTime.fromJSDate(s.nextServiceDate).setZone('Asia/Kolkata').startOf('day');
            const diffDays = Math.ceil(serviceDate.diff(baseDate, 'days').days);
            if (diffDays <= 30) {
                expiringAlerts.push({
                    type: 'Service',
                    identifier: s.vehicle?.carNumber || 'N/A',
                    documentType: 'Upcoming Service (Date)',
                    expiryDate: s.nextServiceDate,
                    daysLeft: diffDays,
                    status: diffDays < 0 ? 'Overdue' : 'Upcoming'
                });
            }
        }

        // KM based alerts
        if (s.nextServiceKm && s.vehicle && !kmAlertedVehicles.has(s.vehicle._id.toString())) {
            const currentKm = s.vehicle.lastOdometer || 0;
            const kmRemaining = s.nextServiceKm - currentKm;

            // Show alert if KM reached or within 500 KM (arbitrary threshold for "Upcoming")
            if (kmRemaining <= 500) {
                kmAlertedVehicles.add(s.vehicle._id.toString());

                const partName = s.category || s.maintenanceType || 'Service Part';

                expiringAlerts.push({
                    type: 'Service',
                    identifier: s.vehicle.carNumber,
                    documentType: `${partName} - Repair Immediately`,
                    expiryDate: null,
                    daysLeft: kmRemaining, // Using daysLeft field to store remaining KM for display
                    status: kmRemaining <= 0 ? 'Urgent: Overdue' : 'Repair Soon',
                    currentKm: currentKm,
                    targetKm: s.nextServiceKm
                });
            }
        }
    });

    const uniqueDriversToday = new Set(attendanceToday.filter(a => a.punchIn && a.punchIn.time).map(a => a.driver?._id?.toString()).filter(id => id));
    const punchOutCount = attendanceToday.filter(a => a.punchOut && a.punchOut.time).length;

    // Calculate total daily salary for unique drivers on duty today
    const workedDriversMap = new Map();
    const freelancerWorkedDriversMap = new Map();

    attendanceToday.forEach(att => {
        if (att.driver) {
            const driverId = att.driver._id ? att.driver._id.toString() : att.driver.toString();
            const wage = (Number(att.dailyWage) || 0) ||
                (att.driver.dailyWage ? Number(att.driver.dailyWage) : 0) ||
                (att.driver.salary ? Number(att.driver.salary) : 0) || 500;

            const bonuses = (Number(att.punchOut?.allowanceTA) || 0) +
                (Number(att.punchOut?.nightStayAmount) || 0) +
                (Number(att.outsideTrip?.bonusAmount) || 0);

            if (att.driver.isFreelancer === true || att.isFreelancer === true) {
                if (!freelancerWorkedDriversMap.has(driverId)) {
                    freelancerWorkedDriversMap.set(driverId, wage + bonuses);
                }
            } else {
                if (!workedDriversMap.has(driverId)) {
                    workedDriversMap.set(driverId, wage + bonuses);
                }
            }
        }
    });

    const dailySalaryTotal = Array.from(workedDriversMap.values()).reduce((sum, val) => sum + Number(val || 0), 0) +
        outsideCarsToday.reduce((sum, v) => sum + Number(v.dutyAmount || 0), 0);
    const dailyFreelancerSalaryTotal = Array.from(freelancerWorkedDriversMap.values()).reduce((sum, val) => sum + Number(val || 0), 0);

    // Calculate MONTHLY salary total (cumulative for the month)
    const monthlyWorkedDrivers = new Map();
    allAttendanceThisMonth.forEach(att => {
        if (att.driver) {
            const driverId = att.driver._id ? att.driver._id.toString() : att.driver.toString();
            const key = `${driverId}_${att.date}`;

            // We only count regular drivers here (isFreelancer !== true)
            if (att.driver.isFreelancer !== true && att.isFreelancer !== true) {
                if (!monthlyWorkedDrivers.has(key)) {
                    const wage = (Number(att.dailyWage) || 0) ||
                        (att.driver.dailyWage ? Number(att.driver.dailyWage) : 0) ||
                        (att.driver.salary ? Number(att.driver.salary) : 0) || 500;

                    const bonuses = (Number(att.punchOut?.allowanceTA) || 0) +
                        (Number(att.punchOut?.nightStayAmount) || 0) +
                        (Number(att.outsideTrip?.bonusAmount) || 0);

                    monthlyWorkedDrivers.set(key, wage + bonuses);
                }
            }
        }
    });

    // IMPROVED: Outside Cars Monthly Total - Use companyObjectId for consistency
    const outsideCarsMonthlyTotal = outsideCarsThisMonth.reduce((sum, v) => sum + (Number(v.dutyAmount) || 0), 0);

    const monthlyRegularSalaryTotal = Array.from(monthlyWorkedDrivers.values()).reduce((sum, val) => sum + (Number(val) || 0), 0);
    const monthlySalaryTotal = monthlyRegularSalaryTotal + outsideCarsMonthlyTotal;

    // Calculate MONTHLY Freelancer salary total
    const monthlyFreelancerWorkedDrivers = new Map();
    allAttendanceThisMonth.forEach(att => {
        if (att.driver && (att.driver.isFreelancer === true || att.isFreelancer === true)) {
            const driverId = att.driver._id ? att.driver._id.toString() : att.driver.toString();
            const key = `${driverId}_${att.date}`;
            if (!monthlyFreelancerWorkedDrivers.has(key)) {
                const wage = (Number(att.dailyWage) || 0) ||
                    (att.driver.dailyWage ? Number(att.driver.dailyWage) : 0) || 500;

                const bonuses = (Number(att.punchOut?.allowanceTA) || 0) +
                    (Number(att.punchOut?.nightStayAmount) || 0) +
                    (Number(att.outsideTrip?.bonusAmount) || 0);

                monthlyFreelancerWorkedDrivers.set(key, wage + bonuses);
            }
        }
    });
    const monthlyFreelancerSalaryTotal = Array.from(monthlyFreelancerWorkedDrivers.values()).reduce((sum, val) => sum + (Number(val) || 0), 0);

    console.log(`[DASHBOARD_DEBUG] Co: ${companyId}, Date: ${targetDate}, Att: ${allAttendanceThisMonth.length}, Out: ${outsideCarsThisMonth.length}, RegSalary: ${monthlyRegularSalaryTotal}, OutSalary: ${outsideCarsMonthlyTotal}`);

    const totalFastagBalance = fastagData[0]?.total || 0;
    const totalAdvancePending = advanceData[0]?.total || 0;
    const totalFreelancerAdvancePending = freelancerAdvanceData[0]?.total || 0;

    // Get individual advances for drivers on duty to show alerts
    const driverIdsOnDuty = [...new Set(filteredAttendance.map(a => a.driver._id))];
    const pendingAdvances = await Advance.find({
        driver: { $in: driverIdsOnDuty },
        status: 'Pending'
    });

    const attendanceWithAdvanceInfo = filteredAttendance.map(attendance => {
        const driverAdvance = pendingAdvances
            .filter(adv => adv.driver.toString() === attendance.driver._id.toString())
            .reduce((sum, adv) => sum + adv.amount, 0);

        return {
            ...attendance.toObject(),
            driverPendingAdvance: driverAdvance
        };
    });

    const monthlyFuelAmount = monthlyFuelData[0]?.total || 0;
    const monthlyMaintenanceAmount = monthlyMaintenanceData[0]?.total || 0;
    const monthlyParkingAmount = monthlyParkingData[0]?.total || 0;
    const monthlyBorderTaxAmount = monthlyBorderTaxData[0]?.total || 0;
    const monthlyAccidentAmount = monthlyAccidentData[0]?.total || 0;
    const totalWarrantyCost = totalWarrantyData[0]?.total || 0;
    const totalExpenseAmount = monthlyFuelAmount + monthlyMaintenanceAmount + monthlyParkingAmount + monthlyBorderTaxAmount + monthlyAccidentAmount + totalWarrantyCost;

    res.json({
        date: targetDate,
        totalVehicles,
        totalDrivers,
        countPunchIns: uniqueDriversToday.size,
        countPunchOuts: punchOutCount,
        pendingApprovalsCount,
        totalFastagBalance,
        totalAdvancePending,
        monthlyFuelAmount,
        monthlyMaintenanceAmount,
        monthlyParkingAmount,
        monthlyBorderTaxAmount,
        monthlyAccidentAmount,
        totalWarrantyCost,
        totalExpenseAmount,
        totalStaff,
        countStaffPresent: staffAttendanceToday.length,
        staffAttendanceToday,
        attendanceDetails: attendanceWithAdvanceInfo,
        expiringAlerts,
        reportedIssues: reportedIssuesList,
        regularAdvances: regularAdvancesList.filter(adv => adv.driver),
        totalAdvancesSum: totalAdvancePending + totalFreelancerAdvancePending,
        // Combined Daily + Monthly + Manual Advances logic
        dailyAdvancesSum: dailySalaryTotal + (dailyAdvanceData[0]?.total || 0),
        dailySalaryTotal,
        dailyFreelancerSalaryTotal,
        monthlySalaryTotal, // Still combined for backward compatibility
        monthlyRegularSalaryTotal: Array.from(monthlyWorkedDrivers.values()).reduce((sum, val) => sum + val, 0),
        monthlyFreelancerSalaryTotal,
        monthlyOutsideCarsTotal: outsideCarsMonthlyTotal,
        monthlyAccidentAmount,
        freelancerAdvances: {
            total: totalFreelancerAdvancePending,
            count: freelancerAdvanceData[0]?.count || 0
        }
    });
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

        const fetchDriversList = async (q, paginated = true) => {
            let mongoQuery = User.find(q).populate('assignedVehicle', 'carNumber model');
            if (paginated) {
                mongoQuery = mongoQuery.limit(pageSize).skip(pageSize * (page - 1));
            }
            const drivers = await mongoQuery.sort({ createdAt: -1 });

            return await Promise.all(drivers.map(async (d) => {
                const driverObj = d.toObject();
                if (d.isFreelancer && d.tripStatus === 'active') {
                    const activeAttendance = await Attendance.findOne({
                        driver: d._id,
                        status: 'incomplete'
                    }).select('punchIn').sort({ createdAt: -1 });
                    driverObj.activeAttendance = activeAttendance;
                }
                return driverObj;
            }));
        };

        if (!usePagination) {
            const drivers = await fetchDriversList(query, false);
            return res.json({ drivers });
        }

        const count = await User.countDocuments(query);
        const driversList = await fetchDriversList(query, true);

        res.json({ drivers: driversList, page, pages: Math.ceil(count / pageSize), total: count });
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

        if (req.body.mobile && req.body.mobile !== driver.mobile) {
            const mobileExists = await User.findOne({ mobile: req.body.mobile });
            if (mobileExists) return res.status(400).json({ message: 'Mobile number already in use' });
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

        if (req.body.isFreelancer !== undefined) {
            driver.isFreelancer = req.body.isFreelancer === 'true' || req.body.isFreelancer === true;
        }

        if (req.body.licenseNumber !== undefined) {
            driver.licenseNumber = req.body.licenseNumber;
        }

        console.log('UPDATING DRIVER:', {
            id: req.params.id,
            updates: {
                name: driver.name,
                mobile: driver.mobile,
                license: driver.licenseNumber,
                freelancer: driver.isFreelancer
            }
        });

        const updatedDriver = await driver.save();
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
    if (req.body.dropLocation !== undefined) updateData.dropLocation = req.body.dropLocation;
    if (req.body.property !== undefined) updateData.property = req.body.property;
    if (req.body.lastOdometer !== undefined) updateData.lastOdometer = Number(req.body.lastOdometer);
    if (req.body.fastagBalance !== undefined) updateData.fastagBalance = Number(req.body.fastagBalance);
    if (req.body.fastagNumber !== undefined) updateData.fastagNumber = req.body.fastagNumber;
    if (req.body.fastagBank !== undefined) updateData.fastagBank = req.body.fastagBank;

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

        await Attendance.deleteOne({ _id: attendance._id });
        res.json({ message: 'Attendance record deleted successfully' });
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
        await Vehicle.deleteOne({ _id: vehicle._id });
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
    const { date, from, to } = req.query; // format: YYYY-MM-DD

    const query = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ]
    };
    let startDate, endDate;

    if (from && to) {
        query.date = { $gte: from, $lte: to };
        startDate = new Date(from);
        endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
    } else if (date) {
        query.date = date;
        startDate = new Date(date);
        endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
    }

    // 1. Fetch Attendance Reports ( Staff + Freelancers)
    const rawAttendance = await Attendance.find(query)
        .populate('driver', 'name mobile isFreelancer')
        .populate('vehicle', 'carNumber model isOutsideCar carType dutyAmount fastagNumber fastagBalance')
        .sort({ date: -1, createdAt: -1 })
        .lean();

    const attendance = rawAttendance.map(a => ({
        ...a,
        isFreelancer: a.isFreelancer || a.driver?.isFreelancer || false,
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
        isOutsideCar: true
    }));

    const finalReports = [...attendance, ...mappedOutside].sort((a, b) => b.date.localeCompare(a.date));

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

    // 5. Fetch Maintenance Records
    const maintenanceQuery = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ]
    };
    if (startDate && endDate) {
        maintenanceQuery.billDate = { $gte: startDate, $lte: endDate };
    }
    const maintenance = await Maintenance.find(maintenanceQuery)
        .populate('vehicle', 'carNumber model')
        .sort({ billDate: -1 });

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

    // 7. Fetch Parking Records
    const parkingQuery = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
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

    res.json({
        attendance: finalReports,
        fastagRecharges,
        borderTax,
        fuel,
        maintenance,
        advances,
        parking,
        accidentLogs,
        partsWarranty
    });
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
    const { amount, method, remarks } = req.body;
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
        date: new Date()
    });

    await vehicle.save();

    res.json({
        message: 'Fastag recharged successfully',
        carNumber: vehicle.carNumber,
        newBalance: vehicle.fastagBalance
    });
});

// @desc    Freelancer Punch In (Manual by Admin)
// @route   POST /api/admin/freelancers/punch-in
// @access  Private/Admin
const freelancerPunchIn = asyncHandler(async (req, res) => {
    const { driverId, vehicleId, km, time, pickUpLocation } = req.body;

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

    // Check if already punched in for THIS specific date
    const existing = await Attendance.findOne({ driver: driverId, date: dutyDate, status: 'incomplete' });
    if (existing) {
        return res.status(400).json({ message: `Driver is already punched in for ${dutyDate}` });
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

    // Sync createdAt with duty date for history
    attendance.createdAt = new Date(dutyDate + 'T12:00:00Z');


    await attendance.save();
    // 4. Update Driver
    driver.tripStatus = 'active';
    driver.assignedVehicle = vehicleId;
    await driver.save();

    // 5. Update Vehicle (and clean up its old driver if any)
    if (vehicle.currentDriver && vehicle.currentDriver.toString() !== driverId) {
        await User.findByIdAndUpdate(vehicle.currentDriver, { assignedVehicle: null });
    }

    vehicle.currentDriver = driverId;
    await vehicle.save();

    res.json({ message: 'Freelancer assigned and duty started', attendance });
});

// @desc    Freelancer Punch Out (Manual by Admin)
// @route   POST /api/admin/freelancers/punch-out
// @access  Private/Admin
const freelancerPunchOut = asyncHandler(async (req, res) => {
    const { driverId, km, time, fuelAmount, parkingAmount, review, dailyWage, dropLocation } = req.body;

    const driver = await User.findById(driverId);
    if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
    }

    // Find the incomplete attendance
    const attendance = await Attendance.findOne({
        driver: driverId,
        status: 'incomplete'
    }).sort({ createdAt: -1 });

    if (!attendance) {
        return res.status(400).json({ message: 'No active punch-in found for this driver' });
    }

    if (dailyWage) {
        attendance.dailyWage = Number(dailyWage);
    }

    attendance.punchOut = {
        km: km || 0,
        time: time ? new Date(time) : new Date(),
        otherRemarks: review
    };

    attendance.fuel = {
        filled: true,
        amount: fuelAmount || 0
    };

    attendance.parking = [{ amount: parkingAmount || 0 }];
    attendance.dropLocation = dropLocation;

    attendance.totalKM = (km || 0) - (attendance.punchIn.km || 0);
    attendance.status = 'completed';
    await attendance.save();

    // --- NEW: Automatically create an Advance record for the daily wage ---
    // REMOVED: This was causing salary to be treated as a debt (Advance).
    // --- End of NEW logic ---

    // Update driver status
    driver.tripStatus = 'approved';
    driver.assignedVehicle = null;
    driver.freelancerReview = review;
    await driver.save();

    // Clear vehicle status
    if (attendance.vehicle) {
        await Vehicle.findByIdAndUpdate(attendance.vehicle, { currentDriver: null });
    }

    res.json({ message: 'Duty completed and vehicle released', attendance });
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
        parkingAmount,
        allowanceTA,
        nightStayAmount,
        review
    } = req.body;

    if (!driverId || !vehicleId || !companyId || !date) {
        return res.status(400).json({ message: 'Please provide required fields: driver, vehicle, company, and date' });
    }

    const driver = await User.findById(driverId);
    if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
    }

    const attendance = new Attendance({
        driver: driverId,
        company: companyId,
        vehicle: vehicleId,
        date,
        status: 'completed',
        dailyWage: driver.dailyWage || 0,
        punchIn: {
            km: Number(punchInKM) || 0,
            time: new Date(date + 'T08:00:00Z'),
        },
        punchOut: {
            km: Number(punchOutKM) || 0,
            time: new Date(date + 'T20:00:00Z'),
            remarks: 'Manual Entry',
            otherRemarks: review || '',
            allowanceTA: allowanceTA ? 100 : 0,
            nightStayAmount: nightStayAmount ? 500 : 0
        },
        totalKM: (Number(punchOutKM) || 0) - (Number(punchInKM) || 0),
        pickUpLocation: 'Office',
        dropLocation: 'Office',
        fuel: {
            filled: false,
            amount: 0
        },
        parking: [{ amount: Number(parkingAmount) || 0 }]
    });

    await attendance.save();

    // --- NEW: Automatically create an Advance record for the daily wage ---
    // REMOVED: This was causing salary to be treated as a debt (Advance).
    // --- End of NEW logic ---

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
        status
    } = req.body;

    const maintenanceData = {
        vehicle: vehicleId,
        company: companyId,
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

    res.status(201).json(record);
});

// @desc    Get all maintenance records for a company
// @route   GET /api/admin/maintenance/:companyId
// @access  Private/Admin
const getMaintenanceRecords = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { month, year } = req.query;

    let query = {
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ]
    };

    if (month && year) {
        const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endOfMonth = new Date(parseInt(year), parseInt(month), 0);
        endOfMonth.setHours(23, 59, 59, 999);
        query.billDate = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const records = await Maintenance.find(query)
        .populate('vehicle', 'carNumber model')
        .sort({ billDate: -1 });
    res.json(records);
});

// @desc    Update maintenance record
// @route   PUT /api/admin/maintenance/:id
// @access  Private/Admin
const updateMaintenanceRecord = asyncHandler(async (req, res) => {
    const maintenance = await Maintenance.findById(req.params.id);

    if (!maintenance) {
        res.status(404);
        throw new Error('Maintenance record not found');
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
        status
    } = req.body;

    if (vehicleId) maintenance.vehicle = vehicleId;
    if (maintenanceType) maintenance.maintenanceType = maintenanceType;
    if (category) maintenance.category = category;
    if (partsChanged) maintenance.partsChanged = JSON.parse(partsChanged);
    if (description) maintenance.description = description;
    if (garageName) maintenance.garageName = garageName;
    if (billNumber) maintenance.billNumber = billNumber;
    if (billDate) maintenance.billDate = billDate;
    if (amount) maintenance.amount = Number(amount);
    if (paymentMode) maintenance.paymentMode = paymentMode;
    if (currentKm) maintenance.currentKm = Number(currentKm);
    if (nextServiceKm) maintenance.nextServiceKm = Number(nextServiceKm);
    if (status) maintenance.status = status;

    if (req.file) {
        maintenance.billPhoto = req.file.path;
    }

    const updatedMaintenance = await maintenance.save();
    res.json(updatedMaintenance);
});

// @desc    Delete maintenance record
// @route   DELETE /api/admin/maintenance/:id
// @access  Private/Admin
const deleteMaintenanceRecord = asyncHandler(async (req, res) => {
    const record = await Maintenance.findById(req.params.id);
    if (record) {
        await record.deleteOne();
        res.json({ message: 'Record removed' });
    } else {
        res.status(404).json({ message: 'Record not found' });
    }
});

// Helper to recalculate fuel metrics using the "Previous Fill" logic
const recalculateFuelMetrics = async (vehicleId) => {
    // Sort by odometer to ensure a proper chain
    const entries = await Fuel.find({ vehicle: vehicleId }).sort({ odometer: 1, date: 1 });
    let prev = null;
    for (const entry of entries) {
        if (!prev) {
            // First entry: no distance or mileage possible yet
            entry.distance = 0;
            entry.mileage = 0;
            entry.costPerKm = 0;
        } else {
            // Distance covered between these two logs
            entry.distance = entry.odometer - prev.odometer;

            if (entry.distance > 0 && prev.quantity > 0) {
                // IMPORTANT: Mileage = Distance covered NOW / Fuel filled LAST TIME
                entry.mileage = Number((entry.distance / prev.quantity).toFixed(2));
                // Cost/KM = Amount spent LAST TIME / Distance covered NOW
                entry.costPerKm = Number((prev.amount / entry.distance).toFixed(2));
            } else {
                entry.distance = entry.distance > 0 ? entry.distance : 0;
                entry.mileage = 0;
                entry.costPerKm = 0;
            }
        }
        await entry.save();
        prev = entry;
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
        // Fetch docs that have parking OR other (car wash, puncture) pending expenses
        const pendingDocs = await Attendance.find({
            company: companyId,
            'pendingExpenses.status': 'pending',
            'pendingExpenses.type': { $in: ['parking', 'other'] }
        })
            .populate('driver', 'name')
            .populate('vehicle', 'carNumber')
            .sort({ date: -1 });

        let formattedExpenses = [];

        pendingDocs.forEach(doc => {
            if (!doc.pendingExpenses) return;

            doc.pendingExpenses.forEach(exp => {
                // Include both 'parking' and 'other' (Car Wash, Puncture) pending expenses
                if ((exp.type === 'parking' || exp.type === 'other') && exp.status === 'pending') {
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
        console.error("Error fetching pending parking/other expenses:", error);
        res.status(500).json({ message: 'Error fetching pending parking expenses' });
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
    const { status } = req.body; // 'approved' or 'rejected'

    console.log(`[approveRejectExpense] Processing: attendanceId=${attendanceId}, expenseId=${expenseId}, status=${status}`);

    if (!['approved', 'rejected'].includes(status)) {
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
    if (expense.status !== 'pending') {
        res.status(400);
        throw new Error('Expense has already been processed');
    }

    expense.status = status;

    if (status === 'approved') {
        if (expense.type === 'fuel') {
            // Optional overrides from Admin
            const { quantity, rate, slipPhoto } = req.body;
            let finalOdometer = Number(req.body.odometer || expense.km || 0);
            let finalAmount = Number(expense.amount || 0);
            // Use admin override OR driver's submitted quantity. Default to 1 to avoid validation error.
            let finalQuantity = quantity ? Number(quantity) : (expense.quantity ? Number(expense.quantity) : 1);
            // Calculate rate: admin override OR driver's rate OR amount/quantity
            let finalRate = rate ? Number(rate) : (expense.rate ? Number(expense.rate) : (finalQuantity > 0 ? Number((finalAmount / finalQuantity).toFixed(2)) : finalAmount));

            // Use Admin provided slipPhoto if available, otherwise fallback to driver's
            const finalSlipPhoto = slipPhoto || expense.slipPhoto || '';

            // Sanitize paymentSource — driver app may send 'Guest' but model requires 'Guest / Client'
            const validPaymentSources = ['Yatree Office', 'Guest / Client'];
            const rawPaymentSource = expense.paymentSource || 'Yatree Office';
            const finalPaymentSource = validPaymentSources.includes(rawPaymentSource)
                ? rawPaymentSource
                : rawPaymentSource.toLowerCase().includes('guest')
                    ? 'Guest / Client'
                    : 'Yatree Office';

            console.log(`[approveRejectExpense] Creating fuel entry: vehicleId=${vehicleId}, amount=${finalAmount}, qty=${finalQuantity}, rate=${finalRate}, odometer=${finalOdometer}, paymentSource=${finalPaymentSource}`);

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
                slipPhoto: finalSlipPhoto
            });

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
            const { slipPhoto } = req.body;
            const finalSlipPhoto = slipPhoto || expense.slipPhoto || '';
            const driverId = attendance.driver?._id || attendance.driver;

            console.log(`[approveRejectExpense] Creating parking entry: vehicleId=${vehicleId}, amount=${expense.amount}`);

            // 1. Add to Parking Collection
            await Parking.create({
                vehicle: vehicleId,
                company: attendance.company,
                driver: driverName,
                driverId: driverId,
                date: expense.createdAt || new Date(),
                amount: expense.amount,
                source: 'Driver',
                receiptPhoto: finalSlipPhoto,
                createdBy: req.user._id
            });

        } else if (expense.type === 'other') {
            // Car Wash, Puncture, or other services — paid hand-to-hand from office
            // Store in Parking collection with a label to distinguish
            const { slipPhoto } = req.body;
            const finalSlipPhoto = slipPhoto || expense.slipPhoto || '';
            const driverId = attendance.driver?._id || attendance.driver;

            // fuelType field stores the service names (e.g., "Car Wash", "Puncture", "Car Wash,Puncture")
            const serviceLabel = expense.fuelType || 'Other Service';

            console.log(`[approveRejectExpense] Creating other-service (${serviceLabel}) entry: vehicleId=${vehicleId}, amount=${expense.amount}`);

            // Store in Parking collection with serviceLabel as notes/remark
            await Parking.create({
                vehicle: vehicleId,
                company: attendance.company,
                driver: driverName,
                driverId: driverId,
                date: expense.createdAt || new Date(),
                amount: expense.amount,
                source: 'Driver',
                receiptPhoto: finalSlipPhoto,
                createdBy: req.user._id,
                notes: serviceLabel  // e.g., "Car Wash", "Puncture", "Car Wash,Puncture"
            });
        }
    }

    await attendance.save();
    console.log(`[approveRejectExpense] Done: expense ${status} successfully`);
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
    const { driverId, month, year } = req.query;

    const query = { company: companyId };
    if (driverId) query.driver = driverId;

    if (month && year) {
        const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endOfMonth = new Date(parseInt(year), parseInt(month), 0);
        endOfMonth.setHours(23, 59, 59, 999);
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

// @desc    Get Salary Summary for all drivers in a company
// @route   GET /api/admin/salary-summary/:companyId
// @access  Private/Admin
const getDriverSalarySummary = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { month, year } = req.query;

    // 1. Get all regular drivers in company (excluding freelancers)
    const drivers = await User.find({
        company: companyId,
        role: 'Driver',
        isFreelancer: { $ne: true }
    }).select('name mobile dailyWage');

    const summaries = await Promise.all(drivers.map(async (driver) => {
        let attendanceQuery = {
            driver: driver._id,
            status: 'completed'
        };

        let advanceQuery = {
            driver: driver._id
        };

        if (month && year) {
            const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endOfMonth = new Date(parseInt(year), parseInt(month), 0);
            endOfMonth.setHours(23, 59, 59, 999);

            // Attendance uses YYYY-MM-DD
            const startStr = DateTime.fromJSDate(startOfMonth).toFormat('yyyy-MM-dd');
            const endStr = DateTime.fromJSDate(endOfMonth).toFormat('yyyy-MM-dd');
            attendanceQuery.date = { $gte: startStr, $lte: endStr };

            advanceQuery.date = { $gte: startOfMonth, $lte: endOfMonth };
        }

        // Exclude Auto-Generated Salary entries
        advanceQuery.remark = { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ };

        // 2. Fetch all completed attendance records for earnings
        const attendance = await Attendance.find(attendanceQuery);

        // 3. Fetch Parking reimbursements (reimbursable expenses)
        // Match driver by ID (preferred) or Name (fallback)
        const parkingQuery = {
            $or: [
                { driverId: driver._id },
                { driver: driver.name }
            ]
        };
        if (month && year) {
            const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endOfMonth = new Date(parseInt(year), parseInt(month), 0);
            endOfMonth.setHours(23, 59, 59, 999);
            parkingQuery.date = { $gte: startOfMonth, $lte: endOfMonth };
        }

        const parkingEntries = await Parking.find(parkingQuery);
        const parkingTotal = parkingEntries.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        // 4. Calculate Earnings
        const attendanceEarnings = attendance.reduce((sum, att) => {
            const wage = Number(att.dailyWage) || Number(driver.dailyWage) || 500;
            const bonuses = (Number(att.punchOut?.allowanceTA) || 0) +
                (Number(att.punchOut?.nightStayAmount) || 0);

            // DO NOT count embedded att.parking or tollParkingAmount here.
            // Parking reimbursements are tracked separately in the Parking collection (parkingTotal below).
            // Counting embedded parking here would cause double-counting.

            return sum + wage + bonuses;
        }, 0);

        const totalEarned = attendanceEarnings + parkingTotal;

        // 5. Fetch Advances
        // A. Monthly Activity (for display)
        const monthlyAdvances = await Advance.find(advanceQuery);
        const totalAdvancesThisMonth = monthlyAdvances.reduce((sum, adv) => sum + (Number(adv.amount) || 0), 0);
        const totalRecoveredThisMonth = monthlyAdvances.reduce((sum, adv) => sum + (Number(adv.recoveredAmount) || 0), 0);

        // B. Lifetime Balance (Pending Advance)
        // Pending Advance should be cumulative (All time given - All time recovered)
        // We exclude Auto-Generated stuff from balance calculation if that's the rule,
        // but typically balance is balance. Use the same filter as above for consistency.
        const allTimeAdvanceQuery = {
            driver: driver._id,
            remark: { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ }
        };
        const allAdvances = await Advance.find(allTimeAdvanceQuery);
        const allTimeGiven = allAdvances.reduce((sum, adv) => sum + (Number(adv.amount) || 0), 0);
        const allTimeRecovered = allAdvances.reduce((sum, adv) => sum + (Number(adv.recoveredAmount) || 0), 0);
        const pendingAdvance = allTimeGiven - allTimeRecovered;

        return {
            driverId: driver._id,
            name: driver.name,
            mobile: driver.mobile,
            totalEarned,
            totalAdvances: totalAdvancesThisMonth, // Show monthly activity
            totalRecovered: totalRecoveredThisMonth, // Show monthly activity
            pendingAdvance, // Show cumulative balance
            netPayable: totalEarned - pendingAdvance, // Net payable considers cumulative debt? 
            // Usually Net Payable = Earnings - Recoveries (Deductions). 
            // If we subtract 'pendingAdvance', we are saying "Pay off entire debt from this salary".
            // If the intention is "Pay off debt from salary", then yes.
            // But usually Net Payable = Earnings - (Advances Taken This Month + Recoveries).
            // Let's stick to the previous logic: Total Earned - Pending Advance.
            // If Pending Advance is large, Net Payable might be negative (Driver owes money).
            netPayable: totalEarned - pendingAdvance,
            workingDays: attendance.length,
            dailyWage: driver.dailyWage || 0 // Added Daily Wage
        };
    }));

    res.json(summaries.filter(s => s.workingDays > 0 || s.totalAdvances > 0));
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
    const { name, mobile, username, password } = req.body;
    console.log('RECREATING EXECUTIVE ATTEMPT:', { name, mobile, username });

    if (!name || !mobile || !password || !username) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check for existing user by mobile or username
    const userExists = await User.findOne({
        $or: [
            { mobile: mobile },
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
            isFreelancer: false
        });

        await executive.save();

        console.log('EXECUTIVE CREATED SUCCESSFULLY:', executive._id);

        res.status(201).json({
            _id: executive._id,
            name: executive.name,
            mobile: executive.mobile,
            username: executive.username,
            role: executive.role
        });
    } catch (error) {
        console.error('Error creating executive:', error);
        res.status(500).json({ message: 'Server error while creating admin', error: error.message });
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

// @desc    Get all parking entries for a company
// @route   GET /api/admin/parking/:companyId
// @access  Private/AdminOrExecutive
const getParkingEntries = asyncHandler(async (req, res) => {
    const { date, from, to } = req.query;
    let query = { company: req.params.companyId };

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
    const staff = await User.find({ company: req.params.companyId, role: 'Staff' })
        .select('-password')
        .sort({ name: 1 });
    res.json(staff);
});

// @desc    Create a new staff member
// @route   POST /api/admin/staff
// @access  Private/AdminOrExecutive
const createStaff = asyncHandler(async (req, res) => {
    const { name, mobile, password, companyId, salary, username } = req.body;

    const userExists = await User.findOne({ $or: [{ mobile }, { username }] });
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
        role: 'Staff'
    });

    res.status(201).json(staff);
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
        .populate('staff', 'name mobile salary')
        .sort({ date: -1 });

    res.json(attendance);
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
        startKm,
        status,
        remarks,
        driverId
    } = req.body;

    // Helper: If updating vehicle, we might want to update the vehicle reference
    if (vehicleId) {
        attendance.vehicle = vehicleId;
    }

    if (driverId) {
        attendance.driver = driverId;
    }

    if (startKm) {
        attendance.punchIn.km = Number(startKm);
    }

    // Allow status override (e.g. force complete)
    if (status) {
        attendance.status = status;
        if (status === 'completed' && !attendance.punchOut.time) {
            attendance.punchOut.time = new Date();
        }
    }

    if (remarks) {
        attendance.punchOut.remarks = remarks;
    }

    const updatedAttendance = await attendance.save();
    res.json(updatedAttendance);
});

// @desc    Get Detailed Salary Breakdown for a specific driver
// @route   GET /api/admin/salary-details/:driverId
// @access  Private/Admin
const getDriverSalaryDetails = asyncHandler(async (req, res) => {
    try {
        console.log('Fetching Salary Details:', req.params.driverId, req.query);
        const { driverId } = req.params;
        const { month, year } = req.query;

        if (!driverId) {
            res.status(400);
            throw new Error('Driver ID is missing');
        }

        if (!month || !year) {
            res.status(400);
            throw new Error('Please provide month and year');
        }

        const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endOfMonth = new Date(parseInt(year), parseInt(month), 0);
        endOfMonth.setHours(23, 59, 59, 999);

        // Date Check
        if (isNaN(startOfMonth.getTime())) {
            res.status(400);
            throw new Error('Invalid Date Parameters');
        }

        const startStr = DateTime.fromJSDate(startOfMonth).toFormat('yyyy-MM-dd');
        const endStr = DateTime.fromJSDate(endOfMonth).toFormat('yyyy-MM-dd');

        // 1. Fetch Attendance
        const attendance = await Attendance.find({
            driver: driverId,
            status: 'completed',
            date: { $gte: startStr, $lte: endStr }
        }).sort({ date: 1 });

        // Parking & Advances fetched AFTER driver is loaded (so driver.name is available below)

        const driver = await User.findById(driverId).select('name mobile dailyWage');
        if (!driver) {
            res.status(404);
            throw new Error('Driver not found');
        }

        // 2. Fetch Parking Entries — match by driverId OR driver name (legacy)
        const parking = await Parking.find({
            $or: [
                { driverId: driverId },
                { driver: driver.name }  // fallback: match by name for older records
            ],
            date: { $gte: startOfMonth, $lte: endOfMonth }
        }).sort({ date: 1 });

        // 3. Fetch Advances
        const advances = await Advance.find({
            driver: driverId,
            date: { $gte: startOfMonth, $lte: endOfMonth },
            remark: { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ }
        });

        // Combine Data
        const dailyBreakdown = attendance.map(att => {
            const wage = Number(att.dailyWage) || Number(driver.dailyWage) || 500;
            const bonuses = (Number(att.punchOut?.allowanceTA) || 0) + (Number(att.punchOut?.nightStayAmount) || 0);

            // Detect if this was a Manual Entry (added by admin via addManualDuty)
            const isManualEntry = att.punchOut?.remarks === 'Manual Entry';

            return {
                date: att.date,
                type: isManualEntry ? 'Manual Entry' : 'Duty',
                wage,
                bonuses,
                parking: 0, // Always 0 - parking is in Parking collection, shown separately
                total: wage + bonuses,
                vehicleId: att.vehicle,
                remarks: isManualEntry ? '' : (att.punchOut?.remarks || '')
            };
        });

        // Summary Totals
        const totalWages = dailyBreakdown.reduce((sum, d) => sum + d.total, 0);
        const parkingTotal = parking.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const totalAdvances = advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
        const grandTotal = totalWages + parkingTotal; // Total Earned (wages + parking reimbursements)
        const netPayable = grandTotal - totalAdvances;

        res.json({
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
                workingDays: attendance.length
            }
        });
    } catch (error) {
        console.error('Error in getDriverSalaryDetails:', error);
        res.status(500).json({ message: error.message });
    }
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
    getDriverSalarySummary,
    getDriverSalaryDetails, // Export new function
    getAllExecutives,
    createExecutive,
    deleteExecutive,
    addParkingEntry,
    getParkingEntries,
    deleteParkingEntry,
    getPendingParkingExpenses,
    getAllStaff,
    createStaff,
    deleteStaff,
    getStaffAttendanceReports,
    addManualDuty,
    deleteAttendance,
    updateAttendance,
    addAccidentLog,
    getAccidentLogs,
    deleteAccidentLog,
    updateMaintenanceRecord
};
