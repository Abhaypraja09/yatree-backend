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

const LeaveRequest = require('../models/LeaveRequest');
const Event = require('../models/Event');
const Loan = require('../models/Loan');
const Allowance = require('../models/Allowance');
const { DateTime } = require('luxon');
const asyncHandler = require('express-async-handler');

console.log('--- ADMIN CONTROLLER LOADED (V1.1) ---');
/* --- PERFORMANCE CACHE --- */
const DASHBOARD_CACHE = require('../utils/cache');
const CACHE_TTL = 10 * 60 * 1000; // 10 mins cache for heavy financial stats

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

        const finalCompanyId = req.tenantFilter?.company || companyId;

        const driver = new User({
            name,
            mobile,
            username,
            password,
            role: 'Driver',
            company: finalCompanyId,
            isFreelancer: isFreelancer === 'true' || isFreelancer === true,
            licenseNumber,
            dailyWage: Number(dailyWage) || 0,
            salary: Number(salary) || 0,
            nightStayBonus: (nightStayBonus !== undefined && nightStayBonus !== '') ? Number(nightStayBonus) : 0,
            sameDayReturnBonus: (sameDayReturnBonus !== undefined && sameDayReturnBonus !== '') ? Number(sameDayReturnBonus) : 0,
            overtime: {
                enabled: req.body.overtimeEnabled === 'true' || req.body.overtimeEnabled === true,
                thresholdHours: Number(req.body.overtimeThreshold) || 9,
                ratePerHour: Number(req.body.overtimeRate) || 0
            }
        });

        if (req.files) {
            const docMappings = [
                { field: 'aadharCard', type: 'Aadhaar Card' },
                { field: 'drivingLicense', type: 'Driving License' },
                { field: 'addressProof', type: 'Address Proof' },
                { field: 'offerLetter', type: 'Offer Letter' }
            ];

            docMappings.forEach(mapping => {
                if (req.files[mapping.field]) {
                    driver.documents.push({
                        documentType: mapping.type,
                        imageUrl: req.files[mapping.field][0].path,
                        expiryDate: mapping.type === 'Driving License' ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) : undefined,
                        verificationStatus: 'Pending'
                    });
                }
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
    // 🛡️ SECURITY: Global system check for car number uniqueness but restricted by tenant filter for safety.
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

    // 🛡️ SECURITY: Trust req.tenantFilter derived from the verified JWT 
    const finalCompanyId = req.tenantFilter?.company || companyId;

    // 🛡️ PLAN LIMIT CHECK
    const company = await Company.findById(finalCompanyId);
    if (company) {
        const currentCount = await Vehicle.countDocuments({ company: finalCompanyId, isOutsideCar: { $ne: true } });
        const limit = company.vehicleLimit || 10;

        if (currentCount >= limit && (isOutsideCar !== 'true' && isOutsideCar !== true)) {
            return res.status(403).json({
                message: `PLAN LIMIT EXCEEDED: Your account is authorized for up to ${limit} internal vehicles. Please contact support or your account manager for an upgrade.`,
                limitReached: true,
                currentLimit: limit
            });
        }
    }

    const vehicle = new Vehicle({
        carNumber: formattedCarNumber,
        model: model || (isOutsideCar ? 'Outside Car' : undefined),
        permitType: permitType || (isOutsideCar ? 'None/Outside' : undefined),
        company: finalCompanyId,
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

    // 🛠️ CACHE FIX: Clear dashboard cache on mutation to ensure real-time update
    DASHBOARD_CACHE.clear();

    res.status(200).json({ message: 'Vehicle assigned successfully' });
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

// @desc    Block or Unblock vehicle
// @route   PATCH /api/admin/vehicles/:id/status
// @access  Private/Admin
const toggleVehicleStatus = asyncHandler(async (req, res) => {
    const { status } = req.body; // 'active' or 'inactive'
    const vehicle = await Vehicle.findById(req.params.id);

    if (vehicle) {
        vehicle.status = status;
        await vehicle.save();
        res.json({ message: `Vehicle ${status} successfully` });
    } else {
        res.status(404).json({ message: 'Vehicle not found' });
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
    console.log(`[DASHBOARD-REQUEST] Co: ${req.params.companyId}, User: ${req.user?.name}, Date: ${req.query.date}`);
    try {
        const { date, from, to, month: qMonth, year: qYear, bypassCache } = req.query;

        // 🔒 MULTI-TENANCY LOCK: Prioritize session-based tenant filter over URL params
        const finalCompanyId = req.tenantFilter?.company || req.user?.company?._id || req.user?.company;

        if (!finalCompanyId || !mongoose.Types.ObjectId.isValid(finalCompanyId)) {
            logToFile(`🚨 SECURITY ALERT: Dashboard stats requested without valid company context for user ${req.user._id}`);
            return res.status(403).json({ message: 'Multi-tenant context missing' });
        }
        const companyObjectId = new mongoose.Types.ObjectId(finalCompanyId);

        const cacheKey = `dash_${finalCompanyId}_${qMonth}_${qYear}_${date}_${from}_${to}`;
        const shouldBypass = bypassCache === 'true' || bypassCache === true;

        if (!shouldBypass) {
            const cached = DASHBOARD_CACHE.get(cacheKey);
            if (cached && (Date.now() - cached.time < CACHE_TTL)) {
                return res.json(cached.data);
            }
        } else {
            console.log(`[DASHBOARD-BYPASS] Bypassing cache for ${finalCompanyId}`);
        }

        const todayIST = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
        const isMonthlyMode = !!(qMonth && qYear);
        const isRangeMode = !!(from && to) && !isMonthlyMode;
        const targetDate = isRangeMode ? to : (date || todayIST);
        const baseDate = DateTime.fromFormat(targetDate, 'yyyy-MM-dd').setZone('Asia/Kolkata').startOf('day');
        const alertThreshold = baseDate.plus({ days: 30 });

        let monthStart, monthEnd;
        if (isMonthlyMode) {
            monthStart = DateTime.fromObject({ year: parseInt(qYear), month: parseInt(qMonth), day: 1 }, { zone: 'Asia/Kolkata' }).startOf('month').toJSDate();
            monthEnd = DateTime.fromObject({ year: parseInt(qYear), month: parseInt(qMonth), day: 1 }, { zone: 'Asia/Kolkata' }).endOf('month').toJSDate();
        } else if (isRangeMode) {
            monthStart = DateTime.fromISO(from, { zone: 'Asia/Kolkata' }).startOf('day').toJSDate();
            monthEnd = DateTime.fromISO(to, { zone: 'Asia/Kolkata' }).endOf('day').toJSDate();
        } else {
            monthStart = baseDate.startOf('month').toJSDate();
            monthEnd = baseDate.endOf('month').toJSDate();
        }

        const monthStartStr = DateTime.fromJSDate(monthStart).toFormat('yyyy-MM-dd');
        const monthEndStr = DateTime.fromJSDate(monthEnd).toFormat('yyyy-MM-dd');
        const yStart = baseDate.startOf('year').toJSDate();
        const yEnd = baseDate.endOf('year').toJSDate();
        const baseMonth = isMonthlyMode ? parseInt(qMonth) : baseDate.month;
        const baseYear = isMonthlyMode ? parseInt(qYear) : baseDate.year;
        const monthPrefix = isMonthlyMode ? `${qYear}-${qMonth.toString().padStart(2, '0')}` : baseDate.toFormat('yyyy-MM');

        // CONCURRENT AGGREGATIONS
        const [
            basicCounts,
            alertData,
            financialData,
            fleetStatus,
            outsideData,
            salaryData,
            miscData
        ] = await Promise.all([
            Vehicle.aggregate([{ $match: { company: companyObjectId } }, { $facet: { total: [{ $count: "c" }], internal: [{ $match: { isOutsideCar: { $ne: true } } }, { $count: "c" }] } }]),
            Promise.all([
                Vehicle.find({ company: companyObjectId, isOutsideCar: { $ne: true }, 'documents.expiryDate': { $lte: alertThreshold.toJSDate() } }).select('carNumber documents model').lean(),
                User.find({ company: companyObjectId, role: 'Driver', 'documents.expiryDate': { $lte: alertThreshold.toJSDate() } }).select('name documents').lean(),
                Maintenance.find({ company: companyObjectId }).sort({ billDate: -1 }).limit(10).lean()
            ]),
            Promise.all([
                Vehicle.aggregate([{ $match: { company: companyObjectId, fastagHistory: { $exists: true } } }, { $unwind: '$fastagHistory' }, { $match: { 'fastagHistory.date': { $gte: monthStart, $lte: monthEnd } } }, { $group: { _id: null, t: { $sum: '$fastagHistory.amount' } } }]),
                Advance.aggregate([{ $lookup: { from: 'users', localField: 'driver', foreignField: '_id', as: 'd' } }, { $unwind: '$d' }, { $match: { company: companyObjectId, 'd.isFreelancer': { $ne: true }, date: { $gte: monthStart, $lte: monthEnd }, remark: { $not: /Daily Salary|Freelancer Daily Salary/ } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
                Fuel.aggregate([{ $match: { company: companyObjectId, date: { $gte: monthStart, $lte: monthEnd } } }, { $group: { _id: null, t: { $sum: '$amount' }, q: { $sum: '$quantity' } } }]),
                Parking.aggregate([{ $match: { company: companyObjectId, date: { $gte: monthStart, $lte: monthEnd } } }, { $group: { _id: "$serviceType", t: { $sum: '$amount' } } }]),
                BorderTax.aggregate([{ $match: { company: companyObjectId, date: { $gte: monthStart, $lte: monthEnd } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
                Maintenance.aggregate([{ $match: { company: companyObjectId, billDate: { $gte: monthStart, $lte: monthEnd } } }, { $group: { _id: null, t: { $sum: '$amount' } } }])
            ]),
            Promise.all([
                Attendance.find({ 
                    company: companyObjectId, 
                    $or: [
                        { date: targetDate }, 
                        { status: 'incomplete' }
                    ] 
                }).populate('driver', 'name mobile isFreelancer salary dailyWage').populate('vehicle', 'carNumber').lean(),
                User.countDocuments({ company: companyObjectId, role: 'Driver', tripStatus: 'pending_approval' }),
                User.countDocuments({ company: companyObjectId, role: 'Staff' }),
                StaffAttendance.find({ company: companyObjectId, date: targetDate }).populate('staff', 'name').lean(),
                Attendance.find({ company: companyObjectId, status: 'incomplete' }).populate('driver', 'name').populate('vehicle', 'carNumber').sort({ createdAt: -1 }).limit(20).lean()
            ]),
            Promise.all([
                Vehicle.aggregate([{ $match: { company: companyObjectId, isOutsideCar: true } }, { $project: { month: { $substr: [{ $ifNull: ["$carNumber", ""] }, { $add: [{ $indexOfBytes: ["$carNumber", "#"] }, 1] }, 7] }, isBuy: { $eq: [{ $ifNull: ["$transactionType", "Buy"] }, "Buy"] }, amount: "$dutyAmount", isE: { $ne: [{ $ifNull: ["$eventId", null] }, null] } } }, { $facet: { e: [{ $match: { month: monthPrefix, isE: true } }, { $group: { _id: null, t: { $sum: "$amount" } } }], o: [{ $match: { month: monthPrefix, isE: false, isBuy: true } }, { $group: { _id: null, t: { $sum: "$amount" } } }] } }]),
                AccidentLog.aggregate([{ $match: { company: companyObjectId, date: { $gte: monthStart, $lte: monthEnd } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
                AccidentLog.aggregate([{ $match: { company: companyObjectId, date: { $gte: yStart, $lte: yEnd } } }, { $group: { _id: null, t: { $sum: '$amount' } } }])
            ]),
            Promise.all([
                getDriverSalarySummaryInternal(companyObjectId, baseMonth, baseYear, false),
                getDriverSalarySummaryInternal(companyObjectId, baseMonth, baseYear, true),
                Attendance.find({ company: companyObjectId, date: { $gte: monthStartStr, $lte: monthEndStr } }).select('punchIn.km punchOut.km pendingExpenses driver').lean(),
                User.find({ company: companyObjectId, role: 'Driver' }).select('name mobile isFreelancer tripStatus assignedVehicle').lean(),
                Vehicle.find({ company: companyObjectId, isOutsideCar: { $ne: true } }).select('carNumber model currentDriver lastOdometer').lean()
            ]),
            Promise.all([
                Fuel.find({ company: companyObjectId, date: { $gte: baseDate.toJSDate(), $lte: baseDate.endOf('day').toJSDate() } }).populate('vehicle', 'carNumber').lean(),
                Advance.aggregate([{ $match: { company: companyObjectId, date: { $gte: baseDate.toJSDate(), $lte: baseDate.endOf('day').toJSDate() } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
                Advance.aggregate([{ $lookup: { from: 'users', localField: 'driver', foreignField: '_id', as: 'd' } }, { $unwind: '$d' }, { $match: { company: companyObjectId, 'd.isFreelancer': true, status: 'Pending' } }, { $group: { _id: null, t: { $sum: '$amount' }, c: { $sum: 1 } } }]),
                Vehicle.aggregate([{ $match: { company: companyObjectId, fastagHistory: { $exists: true } } }, { $unwind: '$fastagHistory' }, { $match: { 'fastagHistory.date': { $gte: baseDate.toJSDate(), $lte: baseDate.endOf('day').toJSDate() } } }, { $group: { _id: null, t: { $sum: '$fastagHistory.amount' } } }])
            ])
        ]);

        // MAP RESULTS
        const totalVehicles = basicCounts[0]?.total[0]?.c || 0;
        const totalInternalVehicles = basicCounts[0]?.internal[0]?.c || 0;
        const [vExp, dExp, upcomingS] = alertData;
        const [fT, aD, mFuel, mPark, bTax, mMaintAgg] = financialData;
        const [attToday, pendingApps, totalStaff, staffAttToday, reportedIss] = fleetStatus;
        const [outFacet, mAcc, yAcc] = outsideData;
        const [salReg, salFree, mAtt, allD, allV] = salaryData;
        const [fToday, aToday, fAdvData, fTToday] = miscData;

        const monthlyRegularSalaryTotal = salReg.reduce((s, x) => s + (x.totalEarned || 0), 0);
        const monthlyNetSalaryTotal = salReg.reduce((s, x) => s + (x.netPayable || 0), 0);
        const monthlyFreelancerSalaryTotal = salFree.reduce((s, x) => s + (x.totalEarned || 0), 0);
        const monthlyEventTotal = outFacet[0]?.e[0]?.t || 0;
        const outsideCarsMonthlyTotal = outFacet[0]?.o[0]?.t || 0;
        const monthlyMaintAmount = mMaintAgg[0]?.t || 0;

        // FLATTEN & CALCULATE ALERTS
        const today = baseDate.toJSDate();
        const alerts = [];
        vExp.forEach(v => {
            (v.documents || []).forEach(doc => {
                if (doc.expiryDate && new Date(doc.expiryDate) <= alertThreshold.toJSDate()) {
                    const d = Math.ceil((new Date(doc.expiryDate) - today) / (1000 * 60 * 60 * 24));
                    alerts.push({ type: 'Vehicle', identifier: v.carNumber, documentType: doc.documentType, expiryDate: doc.expiryDate, daysLeft: d, status: d < 0 ? 'Expired' : 'Expiring Soon' });
                }
            });
        });
        dExp.forEach(d => {
            (d.documents || []).forEach(doc => {
                if (doc.expiryDate && new Date(doc.expiryDate) <= alertThreshold.toJSDate()) {
                    const d = Math.ceil((new Date(doc.expiryDate) - today) / (1000 * 60 * 60 * 24));
                    alerts.push({ type: 'Driver', identifier: d.name, documentType: doc.documentType, expiryDate: doc.expiryDate, daysLeft: d, status: d < 0 ? 'Expired' : 'Expiring Soon' });
                }
            });
        });

        const finalResponse = {
            date: targetDate, totalVehicles, totalInternalVehicles,
            totalDrivers: allD.length, internalDriversCount: allD.filter(d => !d.isFreelancer).length, freelancerDriversCount: allD.filter(d => d.isFreelancer).length,
            countPunchIns: attToday.filter(a => a.date === targetDate).length,
            activeDutiesCount: attToday.filter(a => a.status === 'incomplete').length,
            runningCars: attToday.filter(a => a.status === 'incomplete').length,
            pendingApprovalsCount: pendingApps,
            monthlyFastagTotal: fT[0]?.t || 0,
            monthlyFuelAmount: mFuel[0]?.t || 0,
            monthlyFuelQuantity: mFuel[0]?.q || 0,
            monthlyMaintenanceAmount: monthlyMaintAmount,
            monthlyParkingAmount: mPark.find(p => p._id !== 'car_service')?.t || 0,
            monthlyBorderTaxAmount: bTax[0]?.t || 0,
            monthlyAccidentAmount: mAcc[0]?.t || 0,
            yearlyAccidentAmount: yAcc[0]?.t || 0,

            totalExpenseAmount: (mFuel[0]?.t || 0) + monthlyMaintAmount + (mPark.reduce((s, p) => s + p.t, 0)) + (bTax[0]?.t || 0) + (mAcc[0]?.t || 0),
            totalStaff, countStaffPresent: staffAttToday.length,
            monthlyRegularAdvanceTotal: aD[0]?.t || 0,
            monthlyDriverServicesAmount: mPark.find(p => p._id === 'car_service')?.t || 0,
            staffAttendanceToday: staffAttToday,
            attendanceDetails: attToday,
            expiringAlerts: alerts,
            reportedIssues: reportedIss,
            monthlySalaryTotal: monthlyRegularSalaryTotal + outsideCarsMonthlyTotal,
            monthlyRegularSalaryTotal, monthlyNetSalaryTotal, monthlyFreelancerSalaryTotal,
            monthlyOutsideCarsTotal: outsideCarsMonthlyTotal,
            monthlyEventTotal,
            dailyFuelAmount: { total: fToday.reduce((s, x) => s + (x.amount || 0), 0), count: fToday.length },
            dailyFuelEntries: fToday,
            dailyFastagTotal: fTToday[0]?.t || 0,
            dailyAdvancesSum: aToday[0]?.t || 0,
            freelancerAdvances: { total: fAdvData[0]?.t || 0, count: fAdvData[0]?.c || 0 },
            dutyHistoryThisMonth: mAtt.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 100)
        };

        if (req.user && req.user.role === 'Executive') {
            const p = req.user.permissions || {};
            if (!p.driversService) {
                ['totalDrivers', 'internalDriversCount', 'freelancerDriversCount', 'totalStaff', 'countStaffPresent', 'monthlySalaryTotal', 'monthlyRegularSalaryTotal', 'monthlyNetSalaryTotal', 'monthlyFreelancerSalaryTotal'].forEach(k => finalResponse[k] = 0);
                finalResponse.staffAttendanceToday = [];
                finalResponse.dutyHistoryThisMonth = [];
            }
            if (!p.vehiclesManagement) {
                ['totalVehicles', 'monthlyMaintenanceAmount', 'monthlyAccidentAmount', 'yearlyAccidentAmount'].forEach(k => finalResponse[k] = 0);
                finalResponse.reportedIssues = [];
            }
            if (!p.fleetOperations) {
                ['monthlyFuelAmount', 'monthlyFuelQuantity', 'monthlyParkingAmount', 'monthlyBorderTaxAmount', 'dailyFuelAmount', 'dailyFastagTotal'].forEach(k => finalResponse[k] = 0);
                finalResponse.dailyFuelEntries = [];
            }
        }

        DASHBOARD_CACHE.set(cacheKey, { data: finalResponse, time: Date.now() });
        res.json(finalResponse);
    } catch (err) {
        console.error('[DASHBOARD-ERROR]:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
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
        // 🔒 STRICT TENANT ISOLATION
        if (!req.tenantFilter || !req.tenantFilter.company) {
            return res.status(403).json({ message: 'Access Denied: Missing organization context.' });
        }

        const driverQuery = {
            ...req.tenantFilter,
            role: 'Driver'
        };
        if (req.query.isFreelancer !== undefined) {
            driverQuery.isFreelancer = isFreelancerQuery;
        }

        // 1. Calculate Global Stats for the company
        const allDrivers = await User.find(driverQuery).select('_id status isFreelancer');
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
            const drivers = await fetchDriversList(driverQuery, false);
            return res.json({ drivers, stats });
        }

        const count = await User.countDocuments(driverQuery);
        const driversList = await fetchDriversList(driverQuery, true);

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
        // 🔒 STRICT TENANT ISOLATION: Never bypass the company filter
        if (!req.tenantFilter || !req.tenantFilter.company) {
            logToFile(`🚨 SECURITY VIOLATION: User ${req.user._id} attempted getAllVehicles without tenant filter!`);
            throw new Error('Multi-tenant boundary violation: Company context missing.');
        }

        const mergedQuery = { ...query, ...req.tenantFilter };
        logToFile(`getAllVehicles - Query: ${JSON.stringify(mergedQuery)}`);

        const vehicles = await Vehicle.find(mergedQuery)
            .populate('currentDriver', 'name mobile isFreelancer')
            .sort({ carNumber: 1 });

        // Sync orphans: find freelance drivers who are 'active' but their vehicle is not linked
        const onDutyFreelancers = await User.find({
            ...req.tenantFilter,
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
            // Logic: Admins can reset anyone's password. Drivers/Staff need oldPassword to change their own.
            const isAdmin = ['admin', 'superadmin', 'executive'].includes(req.user.role.toLowerCase());
            
            if (!isAdmin) {
                if (!req.body.oldPassword) {
                    return res.status(400).json({ message: 'Old password is required for security' });
                }
                const isMatch = await driver.matchPassword(req.body.oldPassword);
                if (!isMatch) {
                    return res.status(400).json({ message: 'Current password verification failed' });
                }
            }
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

        if (req.body.overtimeEnabled !== undefined) {
            if (!driver.overtime) driver.overtime = { enabled: false, thresholdHours: 9, ratePerHour: 0 };
            driver.overtime.enabled = req.body.overtimeEnabled === 'true' || req.body.overtimeEnabled === true;
        }
        if (req.body.overtimeThreshold !== undefined) {
            if (!driver.overtime) driver.overtime = { enabled: false, thresholdHours: 9, ratePerHour: 0 };
            driver.overtime.thresholdHours = Number(req.body.overtimeThreshold);
        }
        if (req.body.overtimeRate !== undefined) {
            if (!driver.overtime) driver.overtime = { enabled: false, thresholdHours: 9, ratePerHour: 0 };
            driver.overtime.ratePerHour = Number(req.body.overtimeRate);
        }

        if (req.files) {
            const docMappings = [
                { field: 'aadharCard', type: 'Aadhaar Card' },
                { field: 'drivingLicense', type: 'Driving License' },
                { field: 'addressProof', type: 'Address Proof' },
                { field: 'offerLetter', type: 'Offer Letter' }
            ];

            docMappings.forEach(mapping => {
                if (req.files[mapping.field]) {
                    // Remove old of same type or obsolete Aadhar types if it's Aadhar Card
                    if (mapping.type === 'Aadhaar Card') {
                        driver.documents = driver.documents.filter(doc => !['Aadhaar Card', 'Aadhaar Front', 'Aadhaar Back'].includes(doc.documentType));
                    } else {
                        driver.documents = driver.documents.filter(doc => doc.documentType !== mapping.type);
                    }

                    driver.documents.push({
                        documentType: mapping.type,
                        imageUrl: req.files[mapping.field][0].path,
                        expiryDate: mapping.type === 'Driving License' ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) : undefined,
                        verificationStatus: 'Pending'
                    });
                }
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

    const updatedVehicle = await Vehicle.findOneAndUpdate(
        { _id: vehicleId, ...req.tenantFilter },
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

    // 🔒 MULTI-TENANCY LOCK: Prioritize session-based tenant filter
    const finalCompanyId = req.tenantFilter?.company || req.user?.company?._id || req.user?.company;

    if (!finalCompanyId) {
        logToFile(`🚨 SECURITY VIOLATION: User ${req.user._id} attempted getDailyReports without company context!`);
        return res.status(403).json({ message: 'Resource not found in your organization boundary.' });
    }

    const baseQuery = {
        company: finalCompanyId
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
    const rawAttendanceRaw = await Attendance.find(query)
        .populate('driver', 'name mobile isFreelancer salary dailyWage overtime')
        .populate('vehicle', 'carNumber model isOutsideCar carType dutyAmount fastagNumber fastagBalance')
        .lean();

    // Sort ASC by date then punchIn time so the FIRST duty of the day is processed first for wage dedup
    const rawAttendance = rawAttendanceRaw.slice().sort((a, b) => {
        const dateCmp = (a.date || '').localeCompare(b.date || '');
        if (dateCmp !== 0) return dateCmp;
        const aTime = a.punchIn?.time ? new Date(a.punchIn.time).getTime() : 0;
        const bTime = b.punchIn?.time ? new Date(b.punchIn.time).getTime() : 0;
        return aTime - bTime;
    });

    const enrichedAttendanceBasic = rawAttendance.map(a => ({
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
        fuelQueryForAttendance.date = { $gte: DateTime.fromISO(`${date}`, { zone: 'Asia/Kolkata' }).startOf('day').toJSDate(), $lte: DateTime.fromISO(`${date}`, { zone: 'Asia/Kolkata' }).endOf('day').toJSDate() };
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
        parkingQueryForAttendance.date = { $gte: DateTime.fromISO(`${date}`, { zone: 'Asia/Kolkata' }).startOf('day').toJSDate(), $lte: DateTime.fromISO(`${date}`, { zone: 'Asia/Kolkata' }).endOf('day').toJSDate() };
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
        } else {
            // ONLY use vehicle+date fallback if NOT already explicitly linked to an attendance
            const fDateStr = f.date instanceof Date ? f.date.toISOString().split('T')[0] : String(f.date).split('T')[0];
            const vId = String(f.vehicle?._id || f.vehicle || '');
            const key = `${vId}_${fDateStr}`;
            if (!fuelByVehicleDate.has(key)) fuelByVehicleDate.set(key, []);
            fuelByVehicleDate.get(key).push(f);
        }
    });

    const parkingByAttId = new Map();
    const parkingByVehicleDate = new Map();
    allParkingForAttendance.forEach(p => {
        if (p.attendanceId) {
            const attId = String(p.attendanceId);
            if (!parkingByAttId.has(attId)) parkingByAttId.set(attId, []);
            parkingByAttId.get(attId).push(p);
        } else {
            // ONLY use vehicle+date fallback if NOT already explicitly linked to an attendance
            const pDateStr = p.date instanceof Date ? p.date.toISOString().split('T')[0] : String(p.date).split('T')[0];
            const vId = String(p.vehicle?._id || p.vehicle || '');
            const key = `${vId}_${pDateStr}`;
            if (!parkingByVehicleDate.has(key)) parkingByVehicleDate.set(key, []);
            parkingByVehicleDate.get(key).push(p);
        }
    });

    const seenWageEntries = new Set();
    const enrichedAttendance = enrichedAttendanceBasic.map(a => {
        const attendanceId = String(a._id || '');
        const vId = String(a.vehicle?._id || a.vehicle || '');
        const attDate = a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date);
        const vKey = `${vId}_${attDate}`;

        let matchedFuels = fuelByAttId.get(attendanceId) || [];

        // If not explicitly linked, try the vehicle/date fallback BUT filter by driver name or odometer if possible
        if (matchedFuels.length === 0) {
            const fallbackFuels = fuelByVehicleDate.get(vKey) || [];
            matchedFuels = fallbackFuels.filter(f => {
                // Determine if there are multiple duties for this vehicle today
                // If only one duty exists, we can be more lenient with signals
                const competitorDuties = enrichedAttendanceBasic.filter(other =>
                    String(other.vehicle?._id || other.vehicle || '') === vId &&
                    (other.date instanceof Date ? other.date.toISOString().split('T')[0] : String(other.date)) === attDate &&
                    String(other._id) !== attendanceId
                );
                const hasCompetitors = competitorDuties.length > 0;

                // 1. Match by driver name string (stored in fuel record)
                if (f.driver && a.driver?.name) {
                    const fName = String(f.driver).toLowerCase();
                    const aName = String(a.driver.name).toLowerCase();
                    const isNameMatch = fName.includes(aName) || aName.includes(fName) || fName.split(' ')[0] === aName.split(' ')[0];
                    if (isNameMatch) return true;
                    // If name is provided and doesn't match, definitely not this driver
                    return false;
                }

                // 2. Match by Odometer range
                if (f.odometer && a.punchIn?.km && a.punchOut?.km) {
                    const fKm = Number(f.odometer);
                    const inKm = Number(a.punchIn.km);
                    const outKm = Number(a.punchOut.km);
                    // Match if within range with a small buffer (5km)
                    const isInRange = fKm >= (inKm - 5) && fKm <= (outKm + 5);
                    if (isInRange) return true;
                    // If odo is definitely outside this duty's range, definitely not this duty
                    if (fKm > 0) return false;
                }

                // 3. Match by Time if timestamped
                if (f.date && a.punchIn?.time && a.punchOut?.time) {
                    const fTime = new Date(f.date).getTime();
                    const inTime = new Date(a.punchIn.time).getTime();
                    const outTime = new Date(a.punchOut.time).getTime();
                    // Match if within duty time +/- 1 hour
                    const isInTime = fTime >= (inTime - 3600000) && fTime <= (outTime + 3600000);
                    if (isInTime) return true;
                    // If time is provided and definitely outside, reject
                    return false;
                }

                // If we reach here, we have no strong signals (no specific name, odo, or time in either fuel or attendance)
                // If there's another driver today, don't risk duplicating - only show if there's no better candidate
                return !hasCompetitors;
            });
        }
        const fuelFromCollection = matchedFuels.reduce((s, f) => s + (Number(f.amount) || 0), 0);
        const fuelQuantityFromCollection = matchedFuels.reduce((s, f) => s + (Number(f.quantity) || 0), 0);

        let matchedParking = parkingByAttId.get(attendanceId) || [];
        if (matchedParking.length === 0) {
            const fallbackParking = parkingByVehicleDate.get(vKey) || [];
            matchedParking = fallbackParking.filter(p => {
                const competitorDuties = enrichedAttendanceBasic.filter(other =>
                    String(other.vehicle?._id || other.vehicle || '') === vId &&
                    (other.date instanceof Date ? other.date.toISOString().split('T')[0] : String(other.date)) === attDate &&
                    String(other._id) !== attendanceId
                );
                const hasCompetitors = competitorDuties.length > 0;

                if (p.driver && a.driver?.name) {
                    const pName = String(p.driver).toLowerCase();
                    const aName = String(a.driver.name).toLowerCase();
                    const isNameMatch = pName.includes(aName) || aName.includes(pName) || pName.split(' ')[0] === aName.split(' ')[0];
                    if (isNameMatch) return true;
                    return false;
                }

                // Parking usually has a date/time
                if (p.date && a.punchIn?.time && a.punchOut?.time) {
                    const pTime = new Date(p.date).getTime();
                    const inTime = new Date(a.punchIn.time).getTime();
                    const outTime = new Date(a.punchOut.time).getTime();
                    const isInTime = pTime >= (inTime - 3600000) && pTime <= (outTime + 3600000);
                    if (isInTime) return true;
                    return false;
                }

                return !hasCompetitors;
            });
        }
        const parkingFromCollection = matchedParking.reduce((s, p) => s + (Number(p.amount) || 0), 0);

        const existingFuel = Number(a.fuel?.amount) || 0;
        const totalFuel = (fuelFromCollection > 0 || matchedFuels.length > 0) ? fuelFromCollection : existingFuel;
        const totalFuelQty = (fuelQuantityFromCollection > 0 || matchedFuels.length > 0) ? fuelQuantityFromCollection : (Number(a.fuel?.liters) || 0);

        const existingParking = Number(a.punchOut?.tollParkingAmount) || 0;
        const totalParking = parkingFromCollection > 0 ? parkingFromCollection : existingParking;

        // Calculate Average for this specific duty if KM and Fuel Qty exist
        let dutyAverage = 0;
        if (totalFuelQty > 0 && a.punchIn?.km && a.punchOut?.km) {
            const dist = Number(a.punchOut.km) - Number(a.punchIn.km);
            if (dist > 0) dutyAverage = Number((dist / totalFuelQty).toFixed(2));
        }

        // Ensure wage is only added ONCE per driver per day (first duty gets wage, subsequent duties get 0)
        const driverId = a.driver?._id?.toString() || a.driver?.toString() || 'unk';
        const wageKey = `${driverId}_${attDate}`;
        let finalDailyWage = 0;

        if (!seenWageEntries.has(wageKey)) {
            // Mark this driver+date as seen UNCONDITIONALLY so second duty NEVER gets wage
            seenWageEntries.add(wageKey);
            finalDailyWage = Number(a.dailyWage) || 0;
            if (!finalDailyWage && a.driver) {
                const isFreelancer = a.isFreelancer || a.driver?.isFreelancer || false;
                finalDailyWage = (a.driver.dailyWage ? Number(a.driver.dailyWage) : 0);
                if (!finalDailyWage && !isFreelancer) {
                    finalDailyWage = (a.driver.salary ? Math.round(Number(a.driver.salary) / 26) : 0) || 0;
                }
            }
        }

        // OVERTIME CALCULATION
        let otAmount = 0;
        let otHours = 0;
        if (a.driver?.overtime?.enabled && a.punchIn?.time && a.punchOut?.time) {
            const pIn = new Date(a.punchIn.time);
            const pOut = new Date(a.punchOut.time);
            // Duration in milliseconds
            const durationMs = pOut.getTime() - pIn.getTime();
            const hours = durationMs / (1000 * 60 * 60);
            
            otHours = Math.max(0, hours - (Number(a.driver.overtime.thresholdHours) || 9));
            otAmount = Math.round(otHours * (Number(a.driver.overtime.ratePerHour) || 0));
        }

        return {
            ...a,
            dailyWage: finalDailyWage,
            otAmount,
            otHours: Number(otHours.toFixed(2)),
            fuel: {
                ...(a.fuel || {}),
                amount: totalFuel,
                liters: totalFuelQty,
                avgMileage: dutyAverage,
                entries: a.fuel?.entries?.length
                    ? a.fuel.entries
                    : matchedFuels.map(f => ({ amount: f.amount, fuelType: f.fuelType, km: f.odometer, quantity: f.quantity }))
            },
            punchOut: a.punchOut
                ? { ...a.punchOut, tollParkingAmount: totalParking }
                : { tollParkingAmount: totalParking }
        };
    });

    // Sort descending for display (latest date first) AFTER wage dedup is done
    const finalReports = [...enrichedAttendance, ...mappedOutside].sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        // Same date: sort by punchIn time descending (latest punch-in shown first)
        const aTime = a.punchIn?.time ? new Date(a.punchIn.time).getTime() : 0;
        const bTime = b.punchIn?.time ? new Date(b.punchIn.time).getTime() : 0;
        return bTime - aTime;
    });

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

    // 7. Fetch All Parking Records (Including Car Services)
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



    const finalResponse = {
        attendance: finalReports,
        fastagRecharges,
        borderTax,
        fuel,
        maintenance,
        advances,
        parking,
        accidentLogs,

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
            ['totalVehicles', 'monthlyMaintenanceAmount', 'monthlyAccidentAmount', 'yearlyAccidentAmount'].forEach(k => finalResponse[k] = 0);
            finalResponse.reportedIssues = [];
        }
        if (!p.fleetOperations) {
            ['monthlyFuelAmount', 'monthlyFuelQuantity', 'monthlyParkingAmount', 'monthlyBorderTaxAmount', 'dailyFuelAmount', 'dailyFastagTotal'].forEach(k => finalResponse[k] = 0);
            finalResponse.dailyFuelEntries = [];
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
    logToFile(`[RECHARGE_FASTAG] User: ${req.user?._id}, Role: ${req.user?.role}, Vehicle: ${req.params.id}, Amount: ${amount}`);

    if (req.user?.role === 'Executive' && !req.user?.permissions?.fleetOperations) {
        logToFile(`[RECHARGE_FASTAG] FORBIDDEN: User ${req.user?._id} missing fleetOperations permission`);
        return res.status(403).json({ message: 'Permission Denied: Fleet Operations access required' });
    }

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
    const { driverId, vehicleId, km, time, pickUpLocation, dailyWage } = req.body;
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
        dailyWage: Number(dailyWage) || driver.dailyWage || 0,
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
        const { driverId, km, time, fuelAmount, parkingAmount, review, dailyWage, dropLocation, parkingPaidBy, allowanceTA, nightStayAmount, parkingsJson } = req.body;
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

            // Handle Multi-Parking Receipts
            if (parkingsJson) {
                try {
                    const parkings = JSON.parse(parkingsJson);
                    const photos = req.files.parkingPhotos || [];
                    let photoIdx = 0;

                    const processedParkings = parkings.map(p => {
                        const entry = { amount: Number(p.amount) || 0 };
                        if (p.index !== undefined && photos[photoIdx]) {
                            entry.slipPhoto = photos[photoIdx].path;
                            photoIdx++;
                        }
                        return entry;
                    });

                    attendance.parking = processedParkings;
                    // If multiple slips, pick first for legacy field
                    if (processedParkings.length > 0 && processedParkings[0].slipPhoto) {
                        attendance.punchOut.parkingReceipt = processedParkings[0].slipPhoto;
                    }
                } catch (e) { logToFile(`[ERROR] Parsing parkingsJson: ${e.message}`); }
            }
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
                    paymentSource: 'Office',
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
        // Create Parking records
        if (attendance.parking && attendance.parking.length > 0) {
            for (const p of attendance.parking) {
                if (p.amount > 0) {
                    await Parking.create({
                        vehicle: attendance.vehicle,
                        company: driver.company,
                        driver: driver.name,
                        driverId: driver._id,
                        attendanceId: attendance._id,
                        date: attendance.date ? new Date(attendance.date) : new Date(),
                        amount: p.amount,
                        location: dropLocation || 'Duty End',
                        remark: review || 'Freelancer Duty Off',
                        source: 'Admin',
                        receiptPhoto: p.slipPhoto || attendance.punchOut.parkingReceipt,
                        createdBy: req.user._id,
                        isReimbursable: true
                    });
                }
            }
        } else if (Number(parkingAmount) > 0) {
            // Fallback for single legacy amount
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
    const { driverId, vehicleId, km, time, pickUpLocation, date, dailyWage } = req.body;

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
        dailyWage: Number(dailyWage) || driver.dailyWage || 0,
        punchIn: {
            km: Number(km) || 0,
            time: time ? DateTime.fromISO(time, { zone: 'Asia/Kolkata' }).toJSDate() : new Date(),
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
        time: time ? DateTime.fromISO(time, { zone: 'Asia/Kolkata' }).toJSDate() : new Date(),
        otherRemarks: review || '',
        tollParkingAmount: Number(parkingAmount) || 0,
        parkingPaidBy: parkingPaidBy || 'Self'
    };

    if (fuelAmount) {
        attendance.fuel = {
            filled: true,
            amount: Number(fuelAmount) || 0,
            entries: [{ amount: Number(fuelAmount), paymentSource: 'Office' }]
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

    const finalCompanyId = req.tenantFilter?.company || companyId;

    if (!driverId || !vehicleId || !finalCompanyId || !date) {
        return res.status(400).json({ message: 'Please provide required fields: driver, vehicle, and date' });
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
    let combined = [...mainRecords, ...mappedParking];

    if (requestType === 'driver_services') {
        combined = combined.filter(r => {
            const cat = String(r.category || '').toLowerCase();
            const desc = String(r.description || '').toLowerCase();

            const isWash = cat.includes('wash') || desc.includes('wash');
            const isPuncture = cat.includes('punc') || desc.includes('punc');
            const isTissue = cat.includes('tissue') || desc.includes('tissue');
            const isWater = (cat.includes('water') && !cat.includes('repair') && !cat.includes('leak') && !cat.includes('pump')) ||
                (desc.includes('water') && !desc.includes('repair') && !desc.includes('leak') && !desc.includes('pump'));
            const isOtherService = (r.maintenanceType || '') === 'Driver Services';
            return isWash || isPuncture || isTissue || isWater || isOtherService;
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
        paymentSource: paymentSource || 'Office',
        driver,
        slipPhoto,
        createdBy: req.user._id
    });

    // Try to link to Attendance to prevent duplication in Reports
    try {
        const searchDate = DateTime.fromJSDate(new Date(date || new Date())).setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
        // Search for all attendance records for this vehicle on this day
        const attendances = await Attendance.find({ vehicle: vehicleId, date: searchDate }).populate('driver', 'name');

        let attendance = null;
        if (attendances.length > 0) {
            if (attendances.length === 1) {
                attendance = attendances[0];
            } else if (driver) {
                // Try to match by driver name if multiple records exists
                const dName = String(driver).toLowerCase();
                attendance = attendances.find(att => {
                    const attDName = String(att.driver?.name || '').toLowerCase();
                    return attDName.includes(dName) || dName.includes(attDName) || attDName.split(' ')[0] === dName.split(' ')[0];
                });
                // Fallback to the first one if no name match
                if (!attendance) attendance = attendances[0];
            } else {
                attendance = attendances[0];
            }
        }

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
                    paymentSource: paymentSource || 'Office'
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

    // 🔒 MULTI-TENANCY LOCK
    const finalCompanyId = req.tenantFilter?.company || req.user?.company?._id || req.user?.company || companyId;

    let query = {
        $or: [
            { company: new mongoose.Types.ObjectId(finalCompanyId) },
            { company: finalCompanyId }
        ]
    };

    // Date Range filtering
    let startDate, endDate;
    if (from && to) {
        startDate = new Date(from);
        endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
    } else {
        // Fallback to current month if no dates provided (prevents loading 1000s of records)
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    query.date = { $gte: startDate, $lte: endDate };

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
                        paymentSource: exp.paymentSource || 'Office',
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
                        date: exp.createdAt || doc.date
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
                        date: exp.createdAt || doc.date
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
            const { amount, quantity, rate, slipPhoto, paymentSource } = req.body;
            let finalOdometer = Number(req.body.odometer || expense.km || 0);
            let finalAmount = Number(amount || expense.amount || 0);
            // Use admin override OR driver's submitted quantity. Default to 1 to avoid validation error.
            let finalQuantity = quantity ? Number(quantity) : (expense.quantity ? Number(expense.quantity) : 1);
            // Calculate rate: admin override OR driver's rate OR amount/quantity
            let finalRate = rate ? Number(rate) : (expense.rate ? Number(expense.rate) : (finalQuantity > 0 ? Number((finalAmount / finalQuantity).toFixed(2)) : finalAmount));

            // Use Admin provided slipPhoto if available, otherwise fallback to driver's
            const finalSlipPhoto = (req.body.slipPhoto !== undefined) ? req.body.slipPhoto : (expense.slipPhoto || '');

            // Sanitize paymentSource — use Admin override if provided, else fallback to driver's
            const validPaymentSources = ['Office', 'Guest'];
            const rawPaymentSource = paymentSource || expense.paymentSource || 'Office';
            const finalPaymentSource = (rawPaymentSource.toLowerCase().includes('guest')) ? 'Guest' : 'Office';

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

// @desc    Add allowance
// @route   POST /api/admin/allowances
// @access  Private/Admin
const addAllowance = asyncHandler(async (req, res) => {
    const { driverId, amount, date, remark, type } = req.body;
    const companyId = req.headers['x-company-id'] || req.user.company;

    if (!driverId || !amount) {
        res.status(400);
        throw new Error('Driver and amount are required');
    }

    const allowance = await Allowance.create({
        driver: driverId,
        company: companyId,
        amount,
        date: date || new Date(),
        remark: remark || 'Special Allowance',
        type: type || 'Other',
        createdBy: req.user._id
    });

    res.status(201).json(allowance);
});

// @desc    Get allowances
// @route   GET /api/admin/allowances/:companyId
// @access  Private/Admin
const getAllowances = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { month, year, driverId, from, to } = req.query;

    let query = { company: companyId };

    if (driverId) query.driver = driverId;

    if (from && to) {
        query.date = { $gte: new Date(from), $lte: new Date(to) };
    } else if (month && year) {
        const start = DateTime.fromObject({ year: parseInt(year), month: parseInt(month), day: 1 }).startOf('month').toJSDate();
        const end = DateTime.fromObject({ year: parseInt(year), month: parseInt(month), day: 1 }).endOf('month').toJSDate();
        query.date = { $gte: start, $lte: end };
    }

    const allowances = await Allowance.find(query).populate('driver', 'name mobile').sort({ date: -1 });
    res.json(allowances);
});

// @desc    Update allowance
// @route   PUT /api/admin/allowances/:id
// @access  Private/Admin
const updateAllowance = asyncHandler(async (req, res) => {
    const { amount, date, remark, type, driverId } = req.body;
    const allowance = await Allowance.findById(req.params.id);

    if (!allowance) {
        res.status(404);
        throw new Error('Allowance not found');
    }

    if (driverId) allowance.driver = driverId;
    if (amount !== undefined) allowance.amount = amount;
    if (date) allowance.date = date;
    if (remark) allowance.remark = remark;
    if (type) allowance.type = type;

    await allowance.save();
    res.json(allowance);
});

// @desc    Delete allowance
// @route   DELETE /api/admin/allowances/:id
// @access  Private/Admin
const deleteAllowance = asyncHandler(async (req, res) => {
    const allowance = await Allowance.findById(req.params.id);
    if (!allowance) {
        res.status(404);
        throw new Error('Allowance not found');
    }
    await allowance.deleteOne();
    res.json({ message: 'Allowance deleted' });
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

    const drivers = await User.find(driverQuery).select('name mobile dailyWage salary overtime').lean();
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
        status: { $in: ['completed', 'incomplete'] }
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

    const [allAttendance, allMonthlyAdvances, allParking, allTimeAdvances, allLoans, allAllowances] = await Promise.all([
        Attendance.find(attendanceQuery).lean(),
        Advance.find(advanceQuery).lean(),
        Parking.find(parkingQuery).lean(),
        Advance.find(allTimeAdvanceQuery).lean(),
        Loan.find({ company: companyId }).lean(),
        Allowance.find({
            company: companyId,
            date: { $gte: startJS, $lte: endJS }
        }).lean()
    ]);

    // Grouping records by driver for efficient lookup
    const attByDriver = new Map();
    const advByDriver = new Map();
    const allowanceByDriver = new Map();
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
    allAllowances.forEach(a => {
        if (!a.driver) return;
        const dId = a.driver.toString();
        if (!allowanceByDriver.has(dId)) allowanceByDriver.set(dId, []);
        allowanceByDriver.get(dId).push(a);
    });
    allTimeAdvances.forEach(a => {
        if (!a.driver) return;
        const dId = a.driver.toString();
        if (!allTimeAdvByDriver.has(dId)) allTimeAdvByDriver.set(dId, []);
        allTimeAdvByDriver.get(dId).push(a);
    });
    allParking.forEach(p => {
        let dId = p.driverId?.toString();
        // Fallback to name only if record has NO driverId linked
        if (!dId && p.driver) {
            dId = driverNamesMap.get(p.driver.trim().toLowerCase());
        }
        if (dId && attByDriver.has(dId)) { // Ensure the link is valid for the current group
            if (!parkingByDriver.has(dId)) parkingByDriver.set(dId, []);
            parkingByDriver.get(dId).push(p);
        }
    });

    const loansByDriver = new Map();
    allLoans.forEach(l => {
        if (!l.driver) return;
        const dId = l.driver.toString();
        if (!loansByDriver.has(dId)) loansByDriver.set(dId, []);
        loansByDriver.get(dId).push(l);
    });

    // 4. Summarize each driver
    const summaries = drivers.map(d => {
        try {
            const dId = d._id.toString();
            const driverAtt = attByDriver.get(dId) || [];
            const driverAdv = advByDriver.get(dId) || [];
            const driverAllowance = allowanceByDriver.get(dId) || [];
            const driverParking = parkingByDriver.get(dId) || [];
            const driverAllTimeAdv = allTimeAdvByDriver.get(dId) || [];
            const driverLoans = loansByDriver.get(dId) || [];

            // 💰 RECORD ATTENDANCE EARNINGS
            const dailyAggs = new Map();
            const datesProcessed = new Set();
            let totalRoutineEarnings = 0;
            let nightStayCount = 0;

            driverAtt.forEach(att => {
                const dateStr = att.date || (att.punchIn?.time ? DateTime.fromJSDate(att.punchIn.time).setZone('Asia/Kolkata').toFormat('yyyy-MM-dd') : 'unknown');

                // Base Wage (One per day)
                let wage = 0;
                if (!datesProcessed.has(dateStr)) {
                    // Strictly use Log Book recorded salary (no fallbacks)
                    wage = Number(att.dailyWage) || 0;
                    datesProcessed.add(dateStr);
                }

                // Bonuses & OT
                const sameDayReturn = Number(att.punchOut?.allowanceTA) || 0;
                const nightStay = Number(att.punchOut?.nightStayAmount) || 0;
                const bonuses = Math.max(sameDayReturn + nightStay, Number(att.outsideTrip?.bonusAmount) || 0);

                let otBonus = 0;
                if (d.overtime?.enabled && att.punchIn?.time && att.punchOut?.time) {
                    const durationMs = new Date(att.punchOut.time).getTime() - new Date(att.punchIn.time).getTime();
                    const totalHours = durationMs / (1000 * 60 * 60);
                    const otHours = Math.max(0, totalHours - (Number(d.overtime.thresholdHours) || 9));
                    otBonus = Math.round(otHours * (Number(d.overtime.ratePerHour) || 0));
                }

                totalRoutineEarnings += (wage + bonuses + otBonus);
                if (nightStay > 0) nightStayCount += 1;
            });

            // 🅿️ PARKING
            let parkingTotal = 0;
            const parkingDates = new Set();
            driverParking.forEach(p => {
                parkingTotal += (Number(p.amount) || 0);
            });

            // 🎁 ADDITIONAL ALLOWANCES (SPECIAL PAY)
            const totalAllowances = driverAllowance.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

            // 📉 ADVANCES
            const totalAdvancesThisMonth = driverAdv.reduce((sum, adv) => sum + (Number(adv.amount) || 0), 0);
            const totalRecoveredThisMonth = driverAdv.reduce((sum, adv) => sum + (Number(adv.recoveredAmount) || 0), 0);
            const allTimeGiven = driverAllTimeAdv.reduce((sum, adv) => sum + (Number(adv.amount) || 0), 0);
            const allTimeRecovered = driverAllTimeAdv.reduce((sum, adv) => sum + (Number(adv.recoveredAmount) || 0), 0);

            // 🏦 LOANS & EMI
            let totalEMIDeducted = 0;
            const activeLoansInfo = [];
            driverLoans.forEach(loan => {
                const repayment = (loan.repayments || []).find(r => r.month === parseInt(month) && r.year === parseInt(year));
                if (repayment) {
                    totalEMIDeducted += Number(repayment.amount) || 0;
                    activeLoansInfo.push({ loanId: loan._id, amount: repayment.amount, isPaid: true });
                } else if (loan.status === 'Active' && loan.startDate && loan.remainingAmount > 0) {
                    const selM = parseInt(month);
                    const selY = parseInt(year);
                    const currentPeriod = DateTime.fromObject({ year: selY, month: selM, day: 1 }, { zone: 'Asia/Kolkata' }).startOf('month');
                    const loanStart = DateTime.fromJSDate(loan.startDate).setZone('Asia/Kolkata').startOf('month');
                    const monthsDiff = Math.floor(currentPeriod.diff(loanStart, 'months').months + 0.05);
                    const tenure = parseInt(loan.tenureMonths, 10) || (loan.monthlyEMI > 0 ? Math.round(loan.totalAmount / loan.monthlyEMI) : 12);

                    if (monthsDiff >= 0 && monthsDiff < tenure) {
                        totalEMIDeducted += Number(loan.monthlyEMI) || 0;
                        activeLoansInfo.push({ loanId: loan._id, amount: loan.monthlyEMI, isPaid: false });
                    }
                }
            });

            const totalEarned = totalRoutineEarnings + parkingTotal + totalAllowances;
            const netPayable = totalEarned - totalAdvancesThisMonth - totalEMIDeducted;

            return {
                driverId: dId,
                name: d.name,
                mobile: d.mobile,
                dailyWage: d.dailyWage || 0,
                workingDays: datesProcessed.size,
                nightStayCount,
                totalEarned,
                totalAllowances,
                totalAdvances: totalAdvancesThisMonth,
                recoveredAdvances: totalRecoveredThisMonth,
                totalEMI: totalEMIDeducted,
                netPayable,
                advanceInfo: {
                    totalGiven: allTimeGiven,
                    totalRecovered: allTimeRecovered,
                    pending: allTimeGiven - allTimeRecovered
                },
                activeLoans: activeLoansInfo
            };
        } catch (err) {
            console.error(`[getDriverSalarySummaryInternal] Error for driver ${d._id}:`, err);
            return null;
        }
    }).filter(s => s !== null && (s.workingDays > 0 || s.totalAllowances > 0 || s.totalEMI > 0 || s.totalAdvances > 0));

    return summaries;
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
    // Determine which company to filter by
    const companyId = req.tenantFilter?.company || (req.user.company?._id || req.user.company);

    let query = { role: { $in: ['Executive', 'Admin'] } };

    // If not super admin, only show admins from the same company
    if (req.user.role !== 'SuperAdmin' && companyId) {
        query.company = companyId;
    }

    const executives = await User.find(query).select('-password');
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
            company: req.user.role.toLowerCase() === 'superadmin' ? (req.body.companyId || req.tenantFilter?.company) : (req.user.company?._id || req.user.company),
            permissions: {
                dashboard: true,
                liveFeed: true,
                logBook: true,
                driversService: Boolean(permissions?.driversService),
                buySell: Boolean(permissions?.buySell),
                vehiclesManagement: Boolean(permissions?.vehiclesManagement),
                fleetOperations: Boolean(permissions?.fleetOperations),
                staffManagement: Boolean(permissions?.staffManagement),
                manageAdmins: Boolean(permissions?.manageAdmins),
                reports: permissions?.reports !== undefined ? Boolean(permissions.reports) : true
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

    const validRoles = ['executive', 'admin', 'superadmin'];
    if (executive && validRoles.includes((executive.role || '').toLowerCase())) {
        executive.name = name || executive.name;
        executive.mobile = mobile || executive.mobile;
        executive.username = username || executive.username;
        executive.status = status || executive.status;

        if (permissions) {
            // Robust permission update: Keep existing values for fields not in the request
            const currentPerms = executive.permissions?.toObject() || {};
            const updatedPerms = {
                ...currentPerms,
                driversService: permissions.driversService !== undefined ? Boolean(permissions.driversService) : currentPerms.driversService,
                buySell: permissions.buySell !== undefined ? Boolean(permissions.buySell) : currentPerms.buySell,
                vehiclesManagement: permissions.vehiclesManagement !== undefined ? Boolean(permissions.vehiclesManagement) : currentPerms.vehiclesManagement,
                fleetOperations: permissions.fleetOperations !== undefined ? Boolean(permissions.fleetOperations) : currentPerms.fleetOperations,
                staffManagement: permissions.staffManagement !== undefined ? Boolean(permissions.staffManagement) : currentPerms.staffManagement,
                manageAdmins: permissions.manageAdmins !== undefined ? Boolean(permissions.manageAdmins) : currentPerms.manageAdmins,
                reports: permissions.reports !== undefined ? Boolean(permissions.reports) : (currentPerms.reports ?? true)
            };
            executive.permissions = updatedPerms;
            executive.markModified('permissions');
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
    const validRoles = ['executive', 'admin', 'superadmin'];
    if (executive && validRoles.includes((executive.role || '').toLowerCase())) {
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

    const finalCompanyId = req.tenantFilter?.company || companyId;

    const staff = await User.create({
        name,
        mobile,
        password,
        company: finalCompanyId,
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
        
        if (password) {
            const isAdmin = ['admin', 'superadmin', 'executive'].includes(req.user.role.toLowerCase());
            if (!isAdmin) {
                if (!req.body.oldPassword) {
                    return res.status(400).json({ message: 'Old password is required for security' });
                }
                const isMatch = await staff.matchPassword(req.body.oldPassword);
                if (!isMatch) {
                    return res.status(400).json({ message: 'Current password verification failed' });
                }
            }
            staff.password = password;
        }

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
    const { month, year, staffId: targetStaffId } = req.query;
    if (month && year) {
        const reqMonth = parseInt(month, 10);
        const reqYear = parseInt(year, 10);

        // Fetch 2 months of data to ensure we hit all variations of cycle starts and ends
        const searchStartDT = DateTime.fromObject({ year: reqYear, month: reqMonth, day: 1 }).minus({ days: 31 });
        const searchEndDT = DateTime.fromObject({ year: reqYear, month: reqMonth, day: 1 }).plus({ months: 2 });
        const startStrQuery = searchStartDT.toFormat('yyyy-MM-dd');
        const endStrQuery = searchEndDT.toFormat('yyyy-MM-dd');

        const attQuery = {
            company: companyId,
            date: { $gte: startStrQuery, $lte: endStrQuery }
        };
        if (targetStaffId) attQuery.staff = targetStaffId;

        const rangeAttendance = await StaffAttendance.find(attQuery);

        const staffQuery = { company: companyId, role: 'Staff' };
        if (targetStaffId) staffQuery._id = targetStaffId;
        const allStaff = await User.find(staffQuery);

        const leaveQuery = {
            company: companyId,
            status: 'Approved',
            endDate: { $gte: startStrQuery }
        };
        if (targetStaffId) leaveQuery.staff = targetStaffId;

        const allApprovedLeaves = await LeaveRequest.find(leaveQuery);

        // Index for performance
        const attByStaff = {};
        rangeAttendance.forEach(a => {
            const sId = String(a.staff);
            if (!attByStaff[sId]) attByStaff[sId] = [];
            attByStaff[sId].push(a);
        });

        const leavesByStaff = {};
        allApprovedLeaves.forEach(l => {
            const sId = String(l.staff);
            if (!leavesByStaff[sId]) leavesByStaff[sId] = [];
            leavesByStaff[sId].push(l);
        });
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

            // Filter specific to this staff's cycle using pre-indexed data
            const staffAtt = (attByStaff[String(s._id)] || []).filter(a =>
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
            const myLeaves = leavesByStaff[String(s._id)] || [];
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

            // Positive Accrual Logic: Salary = (Actual Progress + Paid Buffer Days + Sunday Holidays + Extra Sundays) * Rate
            const finalSalary = (regularEffectivePresent + paidLeavesUsed + sundaysPassed + sundaysWorked) * perDaySalary;

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

    // AUTO-COMPLETE LOGIC: If endKm is provided and > 0, and status is still incomplete
    // In the Log Book UI, admins often just enter the end KM. This should signal duty off.
    if (endKm !== undefined && Number(endKm) > 0 && attendance.status === 'incomplete') {
        attendance.status = 'completed';
        console.log(`[ATTENDANCE_UPDATE] Auto-closing duty for ID: ${attendance._id} as endKm (${endKm}) was provided.`);

        // Ensure there is a punch out time if we just marked it as completed
        if (!punchOutTime && (!attendance.punchOut || !attendance.punchOut.time)) {
            attendance.punchOut = attendance.punchOut || {};
            attendance.punchOut.time = new Date();
            attendance.markModified('punchOut');
        }
    }

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
        attendance.punchIn.time = punchInTime ? DateTime.fromISO(punchInTime, { zone: 'Asia/Kolkata' }).toJSDate() : undefined;
        attendance.markModified('punchIn');
    }

    // 3. Punch Out Data (KMs, Time, Expenses)
    if (!attendance.punchOut) attendance.punchOut = {};
    if (endKm !== undefined) {
        attendance.punchOut.km = Number(endKm) || 0;
        attendance.markModified('punchOut');
    }
    if (punchOutTime !== undefined) {
        attendance.punchOut.time = punchOutTime ? DateTime.fromISO(punchOutTime, { zone: 'Asia/Kolkata' }).toJSDate() : undefined;
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
            status: { $in: ['completed', 'incomplete'] },
            date: { $gte: startStr, $lte: endStr }
        }).populate('vehicle', 'carNumber').sort({ date: 1 });

        const driver = await User.findById(driverId).select('name mobile dailyWage salary overtime');
        if (!driver) {
            res.status(404);
            throw new Error('Driver not found');
        }

        // 2. Fetch Parking Entries — prioritize driverId, fallback to name ONLY if no driverId exists on record
        const escapedName = driver.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parking = await Parking.find({
            company: driver.company || req.user.company, // Access via req.user or driver.company
            date: { $gte: startOfMonth, $lte: endOfMonth },
            serviceType: { $ne: 'car_service' },
            isReimbursable: { $ne: false },
            $or: [
                { driverId: driverId },
                {
                    driver: { $regex: new RegExp(`^${escapedName}$`, 'i') },
                    $or: [{ driverId: { $exists: false } }, { driverId: null }]
                }
            ]
        }).sort({ date: 1 });

        // 3. Fetch Advances
        const advances = await Advance.find({
            driver: driverId,
            date: { $gte: startOfMonth, $lte: endOfMonth },
            remark: { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ }
        });

        // 4. Fetch Loans (to show tenure/EMI in PDF/UI)
        const loanQuery = {
            driver: mongoose.Types.ObjectId.isValid(driverId) ? new mongoose.Types.ObjectId(driverId) : driverId,
            status: { $ne: 'Cancelled' }
        };

        const [loans, allowances] = await Promise.all([
            Loan.find(loanQuery).sort({ startDate: 1 }),
            Allowance.find({
                driver: driverId,
                date: { $gte: startOfMonth, $lte: endOfMonth }
            }).sort({ date: 1 })
        ]);

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
                // Strictly use Log Book recorded salary (no fallbacks)
                wage = Number(att.dailyWage) || 0;
                wageUsed.add(att.date);
            }

            // Fetch bonuses for data completeness but exclude from 'total' if requested
            const sameDayReturn = Number(att.punchOut?.allowanceTA) || 0;
            const nightStay = Number(att.punchOut?.nightStayAmount) || 0;
            // bonusAmount in driverController is (allowanceTA + nightStay), so we subtract them to get "extra"
            const otherBonuses = Math.max(0, (Number(att.outsideTrip?.bonusAmount) || 0) - sameDayReturn - nightStay);

            // 🕒 OVERTIME CALCULATION
            let otAmount = 0;
            let otHours = 0;
            if (driver.overtime?.enabled && att.punchIn?.time && att.punchOut?.time) {
                const durationMs = att.punchOut.time.getTime() - att.punchIn.time.getTime();
                const totalHours = durationMs / (1000 * 60 * 60);
                otHours = Math.max(0, totalHours - (Number(driver.overtime.thresholdHours) || 9));
                otAmount = Math.round(otHours * (Number(driver.overtime.ratePerHour) || 0));
            }

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
                otAmount,
                otHours: Number(otHours.toFixed(2)),
                parking: finalParkingCell,
                total: wage + finalParkingCell + sameDayReturn + nightStay + otherBonuses + otAmount, // Include all bonuses and OT in total
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
        const totalOT = dailyBreakdown.reduce((sum, d) => sum + (d.otAmount || 0), 0);
        const totalBonuses = dailyBreakdown.reduce((sum, d) => sum + d.sameDayReturn + d.nightStay + d.otherBonuses, 0);
        const parkingTotal = dailyBreakdown.reduce((sum, d) => sum + d.parking, 0) +
            standaloneParkingEntries.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const totalAdvances = advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
        const totalAllowances = allowances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

        let totalEMI = 0;
        if (month && year) {
            const selM = parseInt(month);
            const selY = parseInt(year);
            const currentPeriod = DateTime.fromObject({ year: selY, month: selM, day: 1 }, { zone: 'Asia/Kolkata' }).startOf('month');

            loans.forEach(loan => {
                if (loan.status === 'Active' && loan.startDate && loan.remainingAmount > 0) {
                    const loanStart = DateTime.fromJSDate(loan.startDate).setZone('Asia/Kolkata').startOf('month');
                    const diff = currentPeriod.diff(loanStart, 'months').months;
                    const monthsSinceStart = Math.floor(diff + 0.05);
                    const tenure = parseInt(loan.tenureMonths, 10) || (loan.monthlyEMI > 0 ? Math.round(loan.totalAmount / loan.monthlyEMI) : 1);

                    if (monthsSinceStart >= 0 && monthsSinceStart < tenure) {
                        // Check if already recorded repayment for this period
                        const repayment = (loan.repayments || []).find(r => r.month === selM && r.year === selY);
                        totalEMI += repayment ? (Number(repayment.amount) || 0) : (Number(loan.monthlyEMI) || 0);
                    }
                }
            });
        }

        const grandTotal = totalWages + parkingTotal + totalBonuses + totalOT + totalAllowances;
        const netPayable = grandTotal - totalAdvances - totalEMI;

        res.json({
            vID: "WAGE_FIX_V2", // VERIFICATION TAG
            driver,
            breakdown: dailyBreakdown,
            advances,
            loans: loans || [],
            allowances,
            parkingEntries: parking,
            summary: {
                totalWages,
                totalOT,
                totalAllowances,
                parkingTotal,
                totalAdvances,
                totalEMI,
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
    }).select('carNumber model fastagHistory');

    // 2. Fetch all related data for the month concurrently
    const [fuelData, maintenanceData, parkingData, attendanceData, borderTaxData, allAllowances] = await Promise.all([
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
            date: { $gte: monthStart, $lte: monthEnd }
        }),
        Attendance.find({
            company: companyId,
            date: { $gte: monthStartStr, $lte: monthEndStr },
            status: { $in: ['completed', 'incomplete'] }
        }).populate('driver', 'name isFreelancer dailyWage salary overtime'),
        BorderTax.find({
            company: companyId,
            date: { $gte: monthStart, $lte: monthEnd }
        }),
        Allowance.find({
            company: companyId,
            date: { $gte: monthStart, $lte: monthEnd }
        })
    ]);

    // PRE-CALCULATE DRIVER SALARIES to correctly attribute daily wage once per day across the whole fleet
    // This ensures Fleet Totals match individual reports when one driver uses multiple vehicles.
    const driverSalaryMap = {}; // vehicleId -> totalSalary
    const driverBreakdownMap = {}; // vehicleId -> { driverName -> salary }
    const globalDriverDayWageSeen = new Set(); // To apply wage only once per day per driver fleet-wide

    // Group allowances by driver and date to attribute to their first vehicle of the day
    const allowanceMap = new Map();
    allAllowances.forEach(al => {
        const dId = al.driver.toString();
        const dateStr = DateTime.fromJSDate(al.date).setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
        const key = `${dId}_${dateStr}`;
        if (!allowanceMap.has(key)) allowanceMap.set(key, 0);
        allowanceMap.set(key, allowanceMap.get(key) + (Number(al.amount) || 0));
    });

    const sortedAtt = [...attendanceData].sort((a, b) => {
        const timeA = a.punchIn?.time ? new Date(a.punchIn.time) : (a.date ? new Date(a.date) : new Date());
        const timeB = b.punchIn?.time ? new Date(b.punchIn.time) : (b.date ? new Date(b.date) : new Date());
        return timeA - timeB;
    });

    sortedAtt.forEach(a => {
        const vId = a.vehicle?.toString();
        if (!vId || !a.driver) return;
        
        const dId = a.driver._id ? a.driver._id.toString() : a.driver.toString();
        const dName = a.driver.name || 'Unknown';
        const dDate = a.date;
        const wageKey = `${dId}_${dDate}`;

        let wage = 0;
        if (!globalDriverDayWageSeen.has(wageKey)) {
            wage = Number(a.dailyWage) || 0;
            globalDriverDayWageSeen.add(wageKey);
        }

        const sameDayReturn = Number(a.punchOut?.allowanceTA) || 0;
        const nightStay = Number(a.punchOut?.nightStayAmount) || 0;
        const bonuses = Math.max(sameDayReturn + nightStay, Number(a.outsideTrip?.bonusAmount) || 0);

        // OT Earnings (Staff only)
        let otEarnings = 0;
        const driver = a.driver;
        if (driver?.overtime?.enabled && a.punchIn?.time && a.punchOut?.time) {
            const punchInTime = a.punchIn.time instanceof Date ? a.punchIn.time : new Date(a.punchIn.time);
            const punchOutTime = a.punchOut.time instanceof Date ? a.punchOut.time : new Date(a.punchOut.time);
            const durationMs = punchOutTime.getTime() - punchInTime.getTime();
            const totalHours = durationMs / (1000 * 60 * 60);
            const otHours = Math.max(0, totalHours - (Number(driver.overtime.thresholdHours) || 9));
            otEarnings = Math.round(otHours * (Number(driver.overtime.ratePerHour) || 0));
        }

        // Global Allowances (Special Pay) - attribute to first vehicle of the day
        const globalAllowances = Number(allowanceMap.get(wageKey) || 0);
        if (globalAllowances > 0) allowanceMap.delete(wageKey);

        const dutyTotal = wage + bonuses + otEarnings + globalAllowances;

        if (!driverSalaryMap[vId]) driverSalaryMap[vId] = 0;
        driverSalaryMap[vId] += dutyTotal;

        if (!driverBreakdownMap[vId]) driverBreakdownMap[vId] = {};
        if (!driverBreakdownMap[vId][dName]) driverBreakdownMap[vId][dName] = 0;
        driverBreakdownMap[vId][dName] += dutyTotal;
    });

    // GLOBAL PAYROLL SUMMARY (100% Independent calculation to match Hub Reports)
    let totalStaffEarningsOnly = 0;
    let totalFreelancerEarningsOnly = 0;

    // 1. Group earnings from Attendance (Wage + Bonus + OT)
    attendanceData.forEach(a => {
        if (!a.driver) return;
        const isFreelancer = a.driver.isFreelancer === true;
        
        // Use the same deduplication for staff wages
        const dId = a.driver._id ? a.driver._id.toString() : a.driver.toString();
        const wageKey = `${dId}_${a.date}`;
        
        let wage = 0;
        if (!globalDriverDayWageSeen.has(wageKey)) {
            // Wait, we need a separate SEEN set for summary to avoid modifying the one used for vehicle rows
        }
        // Let's use a local map for the summary calculation
    });

    // RE-WRITING SIMPLY FOR MAXIMUM ACCURACY:
    const summaryStaff = { wage: 0, bonus: 0, ot: 0, allowance: 0, parking: 0 };
    const summaryFree = { wage: 0, bonus: 0, ot: 0, allowance: 0, parking: 0 };

    const summaryWageSeen = new Set();
    attendanceData.forEach(a => {
        if (!a.driver) return;
        const dId = a.driver._id ? a.driver._id.toString() : a.driver.toString();
        const key = `${dId}_${a.date}`;
        const isFree = a.driver.isFreelancer === true;
        const target = isFree ? summaryFree : summaryStaff;

        if (!summaryWageSeen.has(key)) {
            target.wage += (Number(a.dailyWage) || 0);
            summaryWageSeen.add(key);
        }
        const bonus = Math.max((Number(a.punchOut?.allowanceTA) || 0) + (Number(a.punchOut?.nightStayAmount) || 0), Number(a.outsideTrip?.bonusAmount) || 0);
        target.bonus += bonus;

        if (a.driver?.overtime?.enabled && a.punchIn?.time && a.punchOut?.time) {
            const pIn = new Date(a.punchIn.time);
            const pOut = new Date(a.punchOut.time);
            const hours = (pOut - pIn) / 3600000;
            const otH = Math.max(0, hours - (Number(a.driver.overtime.thresholdHours) || 9));
            target.ot += Math.round(otH * (Number(a.driver.overtime.ratePerHour) || 0));
        }
    });

    allAllowances.forEach(al => {
        if (!al.driver) return;
        const isFree = al.driver.isFreelancer === true; 
        (isFree ? summaryFree : summaryStaff).allowance += (Number(al.amount) || 0);
    });

    parkingData.forEach(p => {
        if (!p.driver) return;
        const isFree = p.driver.isFreelancer === true;
        (isFree ? summaryFree : summaryStaff).parking += (Number(p.amount) || 0);
    });

    const totalStaffEarnings = summaryStaff.wage + summaryStaff.bonus + summaryStaff.ot + summaryStaff.allowance + summaryStaff.parking;
    const totalFreelancerEarnings = summaryFree.wage + summaryFree.bonus + summaryFree.ot + summaryFree.allowance + summaryFree.parking;

    // 3. Process data per vehicle
    const vehicleDetails = vehicles.map(v => {
        const vId = v._id.toString();

        // Fuel
        const vFuel = fuelData.filter(f => f.vehicle?.toString() === vId)
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort latest first to find "latest fill"

        const totalFuelAmount = vFuel.reduce((sum, f) => sum + (f.amount || 0), 0);
        const totalFuelQuantity = vFuel.reduce((sum, f) => sum + (f.quantity || 0), 0);

        // Mileage efficiency calculation: distance / (quantity except last fill for the vehicle)
        let totalFuelDistance = vFuel.reduce((sum, f) => sum + (Number(f.distance) || 0), 0);

        // Fallback: If totalFuelDistance is 0 but we have multiple odometer readings in the month, 
        // use Max - Min odometer as a second-tier source.
        if (totalFuelDistance === 0 && vFuel.length >= 2) {
            const odos = vFuel.map(f => Number(f.odometer) || 0).filter(o => o > 0);
            if (odos.length >= 2) {
                totalFuelDistance = Math.max(...odos) - Math.min(...odos);
            }
        }

        // To match Fuel page logic: exclude the most recent fill quantity from the average balance 
        // since that fuel is still in the tank and hasn't powered a trip distance record yet.
        const efficiencyQuantity = vFuel.reduce((sum, f, idx) => {
            // vFuel is sorted latest first (new Date(b.date) - new Date(a.date)), 
            // so idx === 0 is the most recent fill in the filtered result.
            if (idx === 0 && vFuel.length > 1) return sum;
            return sum + (Number(f.quantity) || 0);
        }, 0);

        const avgMileage = (efficiencyQuantity > 0 && totalFuelDistance > 0)
            ? Number((totalFuelDistance / efficiencyQuantity).toFixed(2))
            : 0;

        // Fastag (from vehicle history)
        const vFastag = (v.fastagHistory || []).filter(h => {
            const hDate = new Date(h.date);
            return hDate >= monthStart && hDate <= monthEnd;
        });
        const totalFastagAmount = vFastag.reduce((sum, h) => sum + (h.amount || 0), 0);

        // Border Tax
        const vBorderTax = borderTaxData.filter(b => b.vehicle?.toString() === vId);
        const totalBorderTaxAmount = vBorderTax.reduce((sum, b) => sum + (b.amount || 0), 0);

        // Separate Maintenance records: General Maintenance vs Service Hub (Wash/Punc)
        const vMaintAll = maintenanceData.filter(m => m.vehicle?.toString() === vId);

        // Reimbursable Parking calculation for this vehicle
        const vReimbursableParking = parkingData.filter(p => p.isReimbursable !== false && p.vehicle?.toString() === vId);
        const totalReimbursableParking = vReimbursableParking.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const serviceRegex = /wash|puncture|puncher|tissue|water|cleaning|mask|sanitizer/i;

        // General Maintenance
        const vGeneralMaint = vMaintAll.filter(m => {
            if (m.maintenanceType === 'Car Service') return false;
            const cat = String(m.category || '').toLowerCase();
            const desc = String(m.description || '').toLowerCase();
            const typeValue = String(m.maintenanceType || '').toLowerCase();
            return !serviceRegex.test(cat) && !serviceRegex.test(desc) && !serviceRegex.test(typeValue);
        });
        const totalMaintAmount = vGeneralMaint.reduce((sum, m) => sum + (m.amount || 0), 0);

        // Service Hub records from Maintenance
        const vMaintServices = vMaintAll.filter(m => {
            if (m.maintenanceType === 'Car Service') return true;
            const cat = String(m.category || '').toLowerCase();
            const desc = String(m.description || '').toLowerCase();
            const typeValue = String(m.maintenanceType || '').toLowerCase();
            return serviceRegex.test(cat) || serviceRegex.test(desc) || serviceRegex.test(typeValue);
        });

        // Split Parking into 'parking' and 'car_service'
        const vParkingEntries = parkingData.filter(p => p.vehicle?.toString() === vId);
        const vParkingServices = vParkingEntries.filter(p => p.serviceType === 'car_service');
        const vActualParking = vParkingEntries.filter(p => p.serviceType !== 'car_service');

        const totalParkingAmount = vActualParking.reduce((sum, p) => sum + (p.amount || 0), 0);

        let washCount = 0;
        let punctureCount = 0;
        let washAmount = 0;
        let punctureAmount = 0;
        let vServicesArray = { wash: [], puncture: [] };

        // Process all service hub candidates
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
                washCount++;
                washAmount += amount;
                vServicesArray.wash.push({ date, amount, id: s._id, source: s.type });
            }
        });

        // 💰 DRIVER SALARY (Globally aggregated to prevent double-counting daily wages)
        const currentVehicleSalary = driverSalaryMap[vId] || 0;
        // MAin poit wla sectuon ko logics total ko count karo aap fim aomdf  jppfdf jsdj disnsPsdnsd Sdj nm  jkj d 
        const currentVehicleBreakdown = driverBreakdownMap[vId] || {};

        const vAtt = attendanceData.filter(a => a.vehicle?.toString() === vId);


        let totalDistance = 0;

        // Pending expenses from attendance (to match dashboard logic)
        let vPendingMaintAmount = 0;
        let vPendingWashAmount = 0;
        let vPendingPuncAmount = 0;
        let vPendingParkingAmount = 0;

        vAtt.forEach(a => {
            // Distance calculation
            if (a.punchIn?.km && a.punchOut?.km) {
                const dist = a.punchOut.km - a.punchIn.km;
                if (dist > 0) totalDistance += dist;
            }

            // Pending Expenses (Approved/Pending ones that aren't yet in standalone collections)
            if (a.pendingExpenses) {
                a.pendingExpenses.forEach(exp => {
                    if (exp.status === 'deleted' || exp.status === 'approved') return; // Approved ones are already in standalone models
                    const amt = Number(exp.amount) || 0;
                    if (exp.type === 'parking') {
                        const isService = serviceRegex.test(exp.fuelType || '') || serviceRegex.test(exp.remark || '');
                        if (isService) {
                            const search = `${exp.fuelType || ''} ${exp.remark || ''}`.toLowerCase();
                            if (search.includes('puncture') || search.includes('puncher')) {
                                vPendingPuncAmount += amt;
                                vServicesArray.puncture.push({ date: a.date, amount: amt, id: exp._id, source: 'pending' });
                            } else {
                                vPendingWashAmount += amt;
                                vServicesArray.wash.push({ date: a.date, amount: amt, id: exp._id, source: 'pending' });
                            }
                        } else {
                            vPendingParkingAmount += amt;
                        }
                    } else if (exp.type === 'other') {
                        const isService = serviceRegex.test(exp.fuelType || '') || serviceRegex.test(exp.remark || '');
                        if (isService) {
                            const search = `${exp.fuelType || ''} ${exp.remark || ''}`.toLowerCase();
                            if (search.includes('puncture') || search.includes('puncher')) {
                                vPendingPuncAmount += amt;
                                vServicesArray.puncture.push({ date: a.date, amount: amt, id: exp._id, source: 'pending' });
                            } else {
                                vPendingWashAmount += amt;
                                vServicesArray.wash.push({ date: a.date, amount: amt, id: exp._id, source: 'pending' });
                            }
                        } else {
                            vPendingMaintAmount += amt;
                        }
                    }
                });
            }
        });

        return {
            vehicleId: vId,
            carNumber: v.carNumber,
            model: v.model,
            driverSalary: currentVehicleSalary,
            reimbursableParking: totalReimbursableParking,
            drivers: Object.keys(currentVehicleBreakdown),
            driverBreakdown: Object.entries(currentVehicleBreakdown).map(([name, salary]) => ({ name, salary })),
            // Prefer fuel-based distance (more reliable), fall back to attendance KM diff
            totalDistance: totalFuelDistance > 0 ? totalFuelDistance : totalDistance,
            fuel: {
                totalAmount: totalFuelAmount,
                totalQuantity: totalFuelQuantity,
                avgMileage: avgMileage,
                count: vFuel.length,
                records: vFuel.map(f => ({
                    date: f.date,
                    amount: f.amount,
                    quantity: f.quantity,
                    receipt: f.receiptNumber,
                    distance: f.distance,
                    mileage: f.mileage,
                    costPerKm: f.costPerKm
                }))
            },
            fastag: {
                totalAmount: totalFastagAmount,
                count: vFastag.length,
                records: vFastag.map(h => ({ date: h.date, amount: h.amount, remarks: h.remarks }))
            },
            borderTax: {
                totalAmount: totalBorderTaxAmount,
                count: vBorderTax.length,
                records: vBorderTax.map(b => ({ date: b.date, amount: b.amount, remark: b.remarks || b.borderName }))
            },
            maintenance: {
                totalAmount: totalMaintAmount + vPendingMaintAmount,
                count: vGeneralMaint.length,
                records: vGeneralMaint.map(m => ({
                    type: m.maintenanceType,
                    category: m.category,
                    amount: m.amount,
                    date: m.billDate,
                    description: m.description
                }))
            },
            parking: {
                totalAmount: totalParkingAmount + vPendingParkingAmount,
                count: vActualParking.length,
                records: vActualParking.map(p => ({ date: p.date, amount: p.amount, location: p.location, remark: p.remark }))
            },
            services: {
                wash: { count: washCount, amount: washAmount + vPendingWashAmount, records: vServicesArray.wash },
                puncture: { count: punctureCount, amount: punctureAmount + vPendingPuncAmount, records: vServicesArray.puncture }
            }
        };
    });

    res.json({
        vehicles: vehicleDetails,
        summary: {
            totalSalary: totalStaffEarnings + totalFreelancerEarnings,
            staffSalary: totalStaffEarnings,
            freelancerSalary: totalFreelancerEarnings
        }
    });
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
        paymentSource: paymentSource || 'Office',
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

    // 🔒 SECURE CONTEXT: Use session-based company ID
    const scId = req.tenantFilter?.company || req.user?.company?._id || req.user?.company;
    if (!scId) return res.status(403).json({ message: 'Unauthorized: Company context missing.' });

    const companyObjectId = new mongoose.Types.ObjectId(scId);
    const cacheKey = `livefeed_${companyId}_${targetDate}`;

    // Explicitly allow manual refresh from the client
    if (req.query.refresh === 'true') {
        DASHBOARD_CACHE.delete(cacheKey);
    }

    if (DASHBOARD_CACHE.has(cacheKey)) {
        const cached = DASHBOARD_CACHE.get(cacheKey);
        if (Date.now() - cached.time < 30 * 1000) { // 30s cache for live feed
            console.log(`[LIVE_FEED] Returning Cached Data for ${companyId} - ${targetDate}`);
            return res.json(cached.data);
        }
    }

    // Use proper Date range for Fuel collection since it stores Date objects
    const startDT = DateTime.fromISO(targetDate, { zone: 'Asia/Kolkata' }).startOf('day').toJSDate();
    const endDT = DateTime.fromISO(targetDate, { zone: 'Asia/Kolkata' }).endOf('day').toJSDate();

    const isToday = targetDate === todayISTString;
    const attQuery = { company: companyObjectId };
    if (isToday) {
        attQuery.$or = [
            { date: targetDate },
            { status: 'incomplete' }
        ];
    } else {
        attQuery.date = targetDate;
    }

    // EXCLUDE 'deleted' status explicitly (safety measure for soft-delete)
    const [attendanceToday, fuelEntriesToday, totalVehicles, liveDriversFeed, allVehicles, outsideVehiclesToday] = await Promise.all([
        Attendance.find(attQuery).populate('driver', 'name mobile isFreelancer salary dailyWage overtime').populate('vehicle', 'carNumber model').lean(),
        Fuel.find({ company: companyObjectId, date: { $gte: startDT, $lte: endDT } }).populate('vehicle', 'carNumber').lean(),
        Vehicle.countDocuments({ company: companyObjectId, isOutsideCar: { $ne: true } }),
        User.find({ company: companyObjectId, role: 'Driver' }).select('name mobile isFreelancer salary dailyWage overtime').lean(),
        Vehicle.find({ company: companyObjectId, isOutsideCar: { $ne: true } }).select('carNumber model').lean(),
        Vehicle.find({
            company: companyObjectId,
            isOutsideCar: true,
            carNumber: { $regex: new RegExp(`#${targetDate}(#|$)`) }
        }).lean()
    ]);

    // Ensure all drivers with attendance today are in the feed, even if not in the default Driver list
    const driversInAttendanceRaw = attendanceToday.map(a => a.driver).filter(d => d);
    const seenDriverIds = new Set(liveDriversFeed.map(df => df._id.toString()));
    const driversInAttendance = [];

    driversInAttendanceRaw.forEach(d => {
        const dId = d._id ? d._id.toString() : d.toString();
        if (!seenDriverIds.has(dId)) {
            driversInAttendance.push(d);
            seenDriverIds.add(dId);
        }
    });

    const combinedDrivers = [...liveDriversFeed, ...driversInAttendance];

    const mappedDrivers = combinedDrivers.map(driver => {
        const atts = attendanceToday.filter(a => a.driver?._id?.toString() === driver._id.toString());
        let status = 'Absent';
        if (atts.some(a => a.status === 'incomplete')) status = 'Present';
        else if (atts.some(a => a.status === 'completed')) status = 'Completed';
        return { ...driver, attendances: atts, status };
    }).filter(driver => {
        // Only show drivers (regular or freelancer) if they have active or completed attendance for the target date
        return driver.status !== 'Absent';
    });

    // Calculate dailyStats for the Live Feed (aligned with Reports.jsx and Freelancers.Hub)
    let regularSalaryTotal = 0;
    let freelancerSalaryTotal = 0;
    const regularDriversWithWageSeen = new Set();
    const freelancerDriversSeen = new Set();
    const regularDriversSeen = new Set();

    attendanceToday.forEach(att => {
        if (!att.driver) return;
        const driverId = att.driver._id ? att.driver._id.toString() : att.driver.toString();
        const isFreelancer = att.driver.isFreelancer === true || att.isFreelancer === true;

        // Per-duty components
        const sameDayReturn = Number(att.punchOut?.allowanceTA) || 0;
        const nightStay = Number(att.punchOut?.nightStayAmount) || 0;
        const bonuses = Math.max(sameDayReturn + nightStay, Number(att.outsideTrip?.bonusAmount) || 0);
        const parking = att.punchOut?.parkingPaidBy !== 'Office' ? (Number(att.punchOut?.tollParkingAmount) || 0) : 0;

        // Wage components
        const attWage = Number(att.dailyWage) || 0;
        const driverWage = Number(att.driver.dailyWage) || 0;

        // Rule: Follow Log Book only (stop guessing profile salaries)
        const wage = attWage; // already Number(att.dailyWage) || 0

        if (isFreelancer) {
            // Freelancers are paid per duty/trip
            freelancerSalaryTotal += (wage + bonuses + parking);
            freelancerDriversSeen.add(driverId);
        } else {
            // Regular drivers: bonuses/parking per duty, but daily wage only ONCE for dashboard stats consistency
            regularSalaryTotal += (bonuses + parking);
            regularDriversSeen.add(driverId);

            if (!regularDriversWithWageSeen.has(driverId)) {
                regularSalaryTotal += wage;
                regularDriversWithWageSeen.add(driverId);
            }
        }
    });

    // Outside Car Vouchers are separate from Freelancer Attendance
    // These are created via OutsideCars.jsx / EventManagement.jsx and should NOT
    // be mixed with freelancerSalary (which tracks isFreelancer=true driver attendance)
    const attendanceVehicleIds = new Set(attendanceToday.map(a => (a.vehicle?._id || a.vehicle || '').toString()));
    const validOutsideVehicles = (outsideVehiclesToday || []).filter(v => !attendanceVehicleIds.has(v._id.toString()));

    let outsideCarTotal = 0;
    validOutsideVehicles.forEach(v => {
        const wage = Number(v.dutyAmount) || 0;
        outsideCarTotal += wage;
    });

    const dailySalaryTotal = regularSalaryTotal;
    const dailyFreelancerSalaryTotal = freelancerSalaryTotal; // Only isFreelancer=true attendance

    const liveVehiclesFeed = allVehicles.map(v => {
        const vIdStr = v._id.toString();
        const vehicleAtts = attendanceToday.filter(a => a.vehicle?._id?.toString() === vIdStr);
        const fuelH = fuelEntriesToday.filter(f => (f.vehicle?._id || f.vehicle || '').toString() === vIdStr);

        const hasActive = vehicleAtts.some(a => a.status === 'incomplete');
        const wasUsedToday = vehicleAtts.length > 0 || fuelH.length > 0;

        return {
            ...v,
            status: hasActive ? 'In Use' : (wasUsedToday ? 'Used' : 'Idle'),
            attendances: vehicleAtts,
            fuelToday: fuelH
        };
    }).filter(v => v.status !== 'Idle') // Only show used/in-use vehicles as requested
        .sort((a, b) => {
            // Priority: 'Used' before 'In Use' to show free/completed cars first as requested
            if (a.status === 'Used' && b.status === 'In Use') return -1;
            if (a.status === 'In Use' && b.status === 'Used') return 1;

            if (a.status === 'Used' && b.status === 'Used') {
                // Sort by punch-out time: earliest first
                const aLastOut = a.attendances[a.attendances.length - 1]?.punchOut?.time || 0;
                const bLastOut = b.attendances[b.attendances.length - 1]?.punchOut?.time || 0;
                return new Date(aLastOut) - new Date(bLastOut);
            }

            // Secondary sort for 'In Use': Latest punch-in first (active ones)
            const aLastTime = a.attendances[a.attendances.length - 1]?.punchIn?.time || 0;
            const bLastTime = b.attendances[b.attendances.length - 1]?.punchIn?.time || 0;
            return new Date(bLastTime) - new Date(aLastTime);
        });

    const activeVehiclesCount = liveVehiclesFeed.filter(v => v.status === 'In Use').length;
    const totalUsedVehiclesCount = liveVehiclesFeed.length; // Since we filtered for only used
    const runningCars = activeVehiclesCount;

    const finalResponse = {
        date: targetDate,
        totalVehicles,
        activeVehiclesCount,
        runningCars,
        totalUsedVehiclesCount,
        countPunchIns: attendanceToday.filter(a => a.punchIn?.time).length,
        dailyFuelAmount: { total: fuelEntriesToday.reduce((sum, f) => sum + (Number(f.amount) || 0), 0) },
        dailyStats: {
            regularSalary: dailySalaryTotal,
            regularDriversCount: regularDriversSeen.size,
            freelancerSalary: dailyFreelancerSalaryTotal,
            freelancerDriversCount: freelancerDriversSeen.size,
            outsideCarSalary: outsideCarTotal,
            outsideCarCount: validOutsideVehicles.length,
            grandTotal: dailySalaryTotal + dailyFreelancerSalaryTotal + outsideCarTotal
        },
        liveDriversFeed: mappedDrivers,
        liveVehiclesFeed,
        dailyFuelEntries: fuelEntriesToday,
        dutyHistoryThisMonth: attendanceToday,
        lastUpdated: new Date().toISOString()
    };

    console.log(`[LIVE_FEED] Company: ${companyId}, Date: ${targetDate}, Active Fleet: ${activeVehiclesCount}/${totalVehicles}`);

    DASHBOARD_CACHE.set(cacheKey, { data: finalResponse, time: Date.now() });
    res.json(finalResponse);
});

const getAllLoans = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const loans = await Loan.find({ company: companyId }).populate('driver', 'name mobile').sort({ createdAt: -1 });
    res.json(loans);
});

const createLoan = asyncHandler(async (req, res) => {
    const { driverId, companyId, totalAmount, monthlyEMI, tenureMonths, startDate, remarks } = req.body;
    const loan = new Loan({
        driver: driverId,
        company: companyId,
        totalAmount: Number(totalAmount),
        monthlyEMI: Number(monthlyEMI),
        tenureMonths: Number(tenureMonths) || 1,
        remainingAmount: Number(totalAmount),
        startDate: startDate || new Date(),
        remarks,
        createdBy: req.user._id
    });
    await loan.save();
    DASHBOARD_CACHE.clear(); // Important: Clear cache so salary summaries reflect the new loan immediately
    res.status(201).json(loan);
});

const updateLoan = asyncHandler(async (req, res) => {
    const { totalAmount, monthlyEMI, tenureMonths, status, remarks, remainingAmount, startDate } = req.body;
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    if (totalAmount !== undefined) loan.totalAmount = Number(totalAmount);
    if (monthlyEMI !== undefined) loan.monthlyEMI = Number(monthlyEMI);
    if (tenureMonths !== undefined) loan.tenureMonths = Number(tenureMonths);
    if (remainingAmount !== undefined) loan.remainingAmount = Number(remainingAmount);
    if (status) loan.status = status;
    if (remarks) loan.remarks = remarks;
    if (startDate) loan.startDate = new Date(startDate);

    await loan.save();
    DASHBOARD_CACHE.clear();
    res.json(loan);
});

const deleteLoan = asyncHandler(async (req, res) => {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    await loan.deleteOne();
    DASHBOARD_CACHE.clear();
    res.json({ message: 'Loan removed' });
});

const recordLoanRepayment = asyncHandler(async (req, res) => {
    const { loanId, month, year, amount } = req.body;
    const loan = await Loan.findById(loanId);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    // Deduct from remaining
    loan.remainingAmount -= Number(amount);
    if (loan.remainingAmount <= 0) {
        loan.remainingAmount = 0;
        loan.status = 'Completed';
    }

    loan.repayments.push({ month: Number(month), year: Number(year), amount: Number(amount) });
    await loan.save();
    res.json(loan);
});

const updateBorderTax = asyncHandler(async (req, res) => {
    const { amount, borderName, date, remarks, driverId } = req.body;
    const entry = await BorderTax.findById(req.params.id);
    if (entry) {
        if (amount) entry.amount = Number(amount);
        if (borderName) entry.borderName = borderName;
        if (date) entry.date = date;
        if (remarks) entry.remarks = remarks;
        if (driverId) entry.driver = driverId;
        if (req.file) entry.receiptPhoto = req.file.path.replace(/\\/g, '/');
        const updatedEntry = await entry.save();
        res.json(updatedEntry);
    } else {
        res.status(404).json({ message: 'Entry not found' });
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
    toggleVehicleStatus,
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
    updateBorderTax,
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
    addAllowance,

    getAllowances,
    updateAllowance,
    deleteAllowance,
    getDriverSalarySummary,
    getDriverSalaryDetails,
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
    getAllLoans,
    createLoan,
    updateLoan,
    deleteLoan,
    recordLoanRepayment
};