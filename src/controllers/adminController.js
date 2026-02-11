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
const { DateTime } = require('luxon');
const asyncHandler = require('express-async-handler');

// @desc    Create a new driver
// @route   POST /api/admin/drivers
// @access  Private/Admin
// @access  Private/Admin
const createDriver = async (req, res, next) => {
    try {
        const { name, mobile, password, companyId, isFreelancer, licenseNumber, username, dailyWage } = req.body;
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
            dailyWage: Number(dailyWage) || 500
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

    const vehicleExists = await Vehicle.findOne({ carNumber });
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

    const vehicle = await Vehicle.create({
        carNumber,
        model,
        permitType,
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

    // Default to today IST if no date provided
    const todayIST = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
    const targetDate = date || todayIST;

    const baseDate = DateTime.fromFormat(targetDate, 'yyyy-MM-dd').setZone('Asia/Kolkata').startOf('day');
    const alertThreshold = baseDate.plus({ days: 30 });
    const monthStart = baseDate.startOf('month').toJSDate();
    const monthEnd = baseDate.endOf('month').toJSDate();

    // Run independent heavy queries concurrently
    const [
        totalVehicles,
        totalDrivers,
        attendanceToday,
        pendingApprovalsCount,
        vehiclesWithExpiringDocs,
        driversWithExpiringDocs,
        fastagData,
        advanceData,
        monthlyFuelData,
        monthlyMaintenanceData,
        upcomingServices,
        totalStaff,
        staffAttendanceToday
    ] = await Promise.all([
        Vehicle.countDocuments({ company: companyId, isOutsideCar: { $ne: true } }),
        User.countDocuments({
            company: companyId,
            role: 'Driver',
            isFreelancer: { $ne: true }
        }),
        Attendance.find({
            company: companyId,
            date: targetDate
        })
            .populate({
                path: 'driver',
                match: { isFreelancer: { $ne: true } },
                select: 'name mobile isFreelancer'
            })
            .populate('vehicle', 'carNumber'),
        User.countDocuments({
            company: companyId,
            role: 'Driver',
            isFreelancer: { $ne: true },
            tripStatus: 'pending_approval'
        }),
        Vehicle.find({
            company: companyId,
            isOutsideCar: { $ne: true },
            'documents.expiryDate': { $lte: alertThreshold.toJSDate() }
        }).select('carNumber documents'),
        User.find({
            company: companyId,
            role: 'Driver',
            isFreelancer: { $ne: true },
            'documents.expiryDate': { $lte: alertThreshold.toJSDate() }
        }).select('name documents'),
        Vehicle.aggregate([
            { $match: { company: new mongoose.Types.ObjectId(companyId) } },
            { $group: { _id: null, total: { $sum: '$fastagBalance' } } }
        ]),
        Advance.aggregate([
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
                    company: new mongoose.Types.ObjectId(companyId),
                    'driverInfo.isFreelancer': { $ne: true }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Fuel.aggregate([
            {
                $match: {
                    company: new mongoose.Types.ObjectId(companyId),
                    date: { $gte: monthStart, $lte: monthEnd }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Maintenance.aggregate([
            {
                $match: {
                    company: new mongoose.Types.ObjectId(companyId),
                    billDate: { $gte: monthStart, $lte: monthEnd }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Maintenance.find({
            company: companyId,
            nextServiceDate: { $lte: alertThreshold.toJSDate(), $gte: baseDate.minus({ days: 7 }).toJSDate() }
        }).populate('vehicle', 'carNumber'),
        User.countDocuments({ company: companyId, role: 'Staff' }),
        StaffAttendance.find({ company: companyId, date: targetDate }).populate('staff', 'name mobile')
    ]);

    // Filter out attendance records where driver didn't match (i.e. was a freelancer)
    const filteredAttendance = attendanceToday.filter(a => a.driver);

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

    upcomingServices.forEach(s => {
        if (s.nextServiceDate) {
            const serviceDate = DateTime.fromJSDate(s.nextServiceDate).setZone('Asia/Kolkata').startOf('day');
            const diffDays = Math.ceil(serviceDate.diff(baseDate, 'days').days);
            expiringAlerts.push({
                type: 'Service',
                identifier: s.vehicle?.carNumber || 'N/A',
                documentType: 'Upcoming Service',
                expiryDate: s.nextServiceDate,
                daysLeft: diffDays,
                status: diffDays < 0 ? 'Overdue' : 'Upcoming'
            });
        }
    });

    const uniqueDriversToday = new Set(filteredAttendance.filter(a => a.punchIn && a.punchIn.time).map(a => a.driver?._id?.toString()));
    const punchOutCount = filteredAttendance.filter(a => a.punchOut && a.punchOut.time).length;

    const totalFastagBalance = fastagData[0]?.total || 0;
    const totalAdvancePending = advanceData[0]?.total || 0;

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
        totalStaff,
        countStaffPresent: staffAttendanceToday.length,
        staffAttendanceToday,
        attendanceDetails: attendanceWithAdvanceInfo,
        expiringAlerts
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
        const query = { company: companyId, role: 'Driver' };
        if (req.query.isFreelancer !== undefined) {
            query.isFreelancer = isFreelancerQuery;
        } else {
            query.isFreelancer = { $ne: true };
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
        const onDutyFreelancers = await User.find({ company: companyId, isFreelancer: true, tripStatus: 'active' });
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

    let query = { company: companyId };
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
        driver.name = req.body.name || driver.name;
        driver.mobile = req.body.mobile || driver.mobile;
        driver.username = req.body.username || driver.username;
        if (req.body.password) {
            driver.password = req.body.password;
        }
        if (req.body.dailyWage !== undefined) {
            driver.dailyWage = Number(req.body.dailyWage);
        }

        const updatedDriver = await driver.save();
        res.json({
            _id: updatedDriver._id,
            name: updatedDriver.name,
            mobile: updatedDriver.mobile,
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
    console.log('UPDATE VEHICLE REQUEST:', { id: req.params.id, body: req.body });
    const vehicle = await Vehicle.findById(req.params.id);

    if (vehicle) {
        vehicle.carNumber = req.body.carNumber || vehicle.carNumber;
        vehicle.model = req.body.model || vehicle.model;
        vehicle.permitType = req.body.permitType || vehicle.permitType;
        vehicle.carType = req.body.carType || vehicle.carType;
        vehicle.status = req.body.status || vehicle.status;

        if (req.body.isOutsideCar !== undefined) {
            vehicle.isOutsideCar = req.body.isOutsideCar === 'true' || req.body.isOutsideCar === true;
        }
        if (req.body.driverName !== undefined) vehicle.driverName = req.body.driverName;
        if (req.body.ownerName !== undefined) vehicle.ownerName = req.body.ownerName;
        if (req.body.dutyAmount !== undefined) vehicle.dutyAmount = Number(req.body.dutyAmount);
        if (req.body.dutyType !== undefined) vehicle.dutyType = req.body.dutyType;
        if (req.body.dropLocation !== undefined) vehicle.dropLocation = req.body.dropLocation;
        if (req.body.property !== undefined) vehicle.property = req.body.property;

        const updatedVehicle = await vehicle.save();
        res.json(updatedVehicle);
    } else {
        res.status(404).json({ message: 'Vehicle not found' });
    }
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

    const query = { company: companyId };
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
    const attendance = await Attendance.find(query)
        .populate('driver', 'name mobile isFreelancer')
        .populate('vehicle', 'carNumber model isOutsideCar carType dutyAmount fastagNumber fastagBalance')
        .sort({ date: -1, createdAt: -1 });

    // 2. Fetch Outside Cars (Freelancer vehicles logged as vehicles)
    // We filter by date using the #date tag in carNumber
    const dateFilter = date || (from && to ? { $gte: from, $lte: to } : null);

    let outsideVehicles = [];
    if (date) {
        outsideVehicles = await Vehicle.find({
            company: companyId,
            isOutsideCar: true,
            carNumber: { $regex: `#${date}(#|$)` }
        });
    } else if (from && to) {
        // For range, we might need a more complex regex or multiple queries
        // Simplest: fetch all outside cars of company and filter in memory
        const allOutside = await Vehicle.find({ company: companyId, isOutsideCar: true });
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
            { $match: { company: new mongoose.Types.ObjectId(companyId) } },
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
                    carNumber: 1,
                    date: '$fastagHistory.date',
                    amount: '$fastagHistory.amount',
                    method: '$fastagHistory.method',
                    remarks: '$fastagHistory.remarks'
                }
            },
            { $sort: { date: -1 } }
        ]);
    }

    // 3. Fetch Border Tax
    const borderTaxQuery = { company: companyId };
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
    const fuelQuery = { company: companyId };
    if (startDate && endDate) {
        fuelQuery.date = { $gte: startDate, $lte: endDate };
    }
    const fuel = await Fuel.find(fuelQuery)
        .populate('vehicle', 'carNumber')
        .sort({ date: -1 });

    // 5. Fetch Maintenance Records
    const maintenanceQuery = { company: companyId };
    if (startDate && endDate) {
        maintenanceQuery.billDate = { $gte: startDate, $lte: endDate };
    }
    const maintenance = await Maintenance.find(maintenanceQuery)
        .populate('vehicle', 'carNumber model')
        .sort({ billDate: -1 });

    // 6. Fetch Advances
    const advancesQuery = { company: companyId };
    if (startDate && endDate) {
        advancesQuery.date = { $gte: startDate, $lte: endDate };
    }
    const advances = await Advance.find(advancesQuery)
        .populate('driver', 'name mobile')
        .sort({ date: -1 });

    // 7. Fetch Parking Records
    const parkingQuery = { company: companyId };
    if (startDate && endDate) {
        parkingQuery.date = { $gte: startDate, $lte: endDate };
    }
    const parking = await Parking.find(parkingQuery)
        .populate('vehicle', 'carNumber model')
        .sort({ date: -1 });

    res.json({
        attendance: finalReports,
        fastagRecharges,
        borderTax,
        fuel,
        maintenance,
        advances,
        parking
    });
});

const approveNewTrip = asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    const driver = await User.findById(driverId);
    if (!driver) {
        res.status(404);
        throw new Error('Driver not found');
    }
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

    let query = { company: companyId };
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
        dailyWage: driver.dailyWage || 500,
        punchIn: {
            km: km || 0,
            time: time ? new Date(time) : new Date(),
        },
        pickUpLocation: pickUpLocation,
        status: 'incomplete'
    });

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
    res.status(201).json(record);
});

// @desc    Get all maintenance records for a company
// @route   GET /api/admin/maintenance/:companyId
// @access  Private/Admin
const getMaintenanceRecords = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { month, year } = req.query;

    let query = { company: companyId };

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
        driver
    } = req.body;

    if (!vehicleId || !companyId || !fuelType || !amount || !quantity || !odometer) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Find previous entry for calculations
    const prevEntry = await Fuel.findOne({ vehicle: vehicleId })
        .sort({ odometer: -1 });

    let distance = 0;
    let mileage = 0;
    let costPerKm = 0;

    if (prevEntry) {
        distance = Number(odometer) - Number(prevEntry.odometer);
        if (distance > 0) {
            mileage = distance / Number(quantity);
            costPerKm = Number(amount) / distance;
        }
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
        driver,
        distance,
        mileage: Number(mileage.toFixed(2)),
        costPerKm: Number(costPerKm.toFixed(2)),
        createdBy: req.user._id
    });

    res.status(201).json(fuelEntry);
});

// @desc    Get Fuel Entries
// @route   GET /api/admin/fuel/:companyId
// @access  Private/Admin
const getFuelEntries = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { from, to, vehicleId } = req.query;

    let query = { company: companyId };

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
        driver
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
    entry.driver = driver || entry.driver;

    // Recalculate if odometer or quantity changed
    const prevEntry = await Fuel.findOne({
        vehicle: entry.vehicle,
        _id: { $ne: entry._id },
        odometer: { $lt: entry.odometer }
    }).sort({ odometer: -1 });

    if (prevEntry) {
        entry.distance = entry.odometer - prevEntry.odometer;
        if (entry.distance > 0 && entry.quantity > 0) {
            entry.mileage = Number((entry.distance / entry.quantity).toFixed(2));
            entry.costPerKm = Number((entry.amount / entry.distance).toFixed(2));
        }
    }

    const updatedEntry = await entry.save();
    res.json(updatedEntry);
});


// @desc    Get all pending fuel expenses for a company
// @route   GET /api/admin/fuel/pending/:companyId
// @access  Private/Admin
const getPendingFuelExpenses = asyncHandler(async (req, res) => {
    try {
        const { companyId } = req.params;
        const pendingDocs = await Attendance.find({
            company: companyId,
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

// @desc    Get all pending parking expenses for a company
// @route   GET /api/admin/parking/pending/:companyId
// @access  Private/AdminOrExecutive
const getPendingParkingExpenses = asyncHandler(async (req, res) => {
    try {
        const { companyId } = req.params;
        const pendingDocs = await Attendance.find({
            company: companyId,
            'pendingExpenses.type': 'parking',
            'pendingExpenses.status': 'pending'
        })
            .populate('driver', 'name')
            .populate('vehicle', 'carNumber')
            .sort({ date: -1 });

        let formattedExpenses = [];

        pendingDocs.forEach(doc => {
            if (!doc.pendingExpenses) return;

            doc.pendingExpenses.forEach(exp => {
                if (exp.type === 'parking' && exp.status === 'pending') {
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
        console.error("Error fetching pending parking expenses:", error);
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
    await Fuel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Entry removed' });
});

// @desc    Approve or Reject a pending expense from Attendance
// @route   PATCH /api/admin/attendance/:attendanceId/expense/:expenseId
// @access  Private/Admin
const approveRejectExpense = asyncHandler(async (req, res) => {
    const { attendanceId, expenseId } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
        res.status(400);
        throw new Error('Invalid status');
    }

    const attendance = await Attendance.findById(attendanceId).populate('driver').populate('vehicle');
    if (!attendance) {
        res.status(404);
        throw new Error('Attendance record not found');
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
            const { quantity, rate } = req.body;
            let finalOdometer = req.body.odometer || expense.km || 0;
            let finalAmount = expense.amount;
            // Use admin override OR driver's submitted quantity OR 0
            let finalQuantity = quantity ? Number(quantity) : (expense.quantity ? Number(expense.quantity) : 0);
            let finalRate = rate ? Number(rate) : (expense.rate ? Number(expense.rate) : (finalQuantity && finalAmount ? Number((finalAmount / finalQuantity).toFixed(2)) : 0));

            // Calculate Distance
            const prevEntry = await Fuel.findOne({
                vehicle: attendance.vehicle._id,
                odometer: { $lt: finalOdometer }
            }).sort({ odometer: -1 });

            let distance = 0;
            let mileage = 0;
            let costPerKm = 0;

            if (prevEntry) {
                distance = finalOdometer - prevEntry.odometer;
            }

            // Calculate Mileage & Cost/Km
            if (finalQuantity > 0 && distance > 0) {
                mileage = Number((distance / finalQuantity).toFixed(2));
                costPerKm = Number((finalAmount / distance).toFixed(2));
            }

            // 1. Add to Fuel Collection
            await Fuel.create({
                vehicle: attendance.vehicle._id,
                company: attendance.company,
                fuelType: expense.fuelType || 'Diesel',
                date: expense.createdAt,
                amount: finalAmount,
                quantity: finalQuantity,
                rate: finalRate,
                odometer: finalOdometer,
                distance: distance,
                mileage: mileage,
                costPerKm: costPerKm,
                driver: attendance.driver.name,
                createdBy: req.user._id,
                source: 'Driver',
                stationName: req.body.stationName || '',
                slipPhoto: expense.slipPhoto
            });

            // 2. Add to verified fuel entries in Attendance
            attendance.fuel.filled = true;
            attendance.fuel.entries.push({
                amount: finalAmount,
                km: finalOdometer,
                fuelType: expense.fuelType || 'Diesel',
                slipPhoto: expense.slipPhoto
            });
            attendance.fuel.amount = (attendance.fuel.amount || 0) + finalAmount;
        } else if (expense.type === 'parking') {
            // 1. Add to Parking Collection
            await Parking.create({
                vehicle: attendance.vehicle._id,
                company: attendance.company,
                driver: attendance.driver.name,
                date: expense.createdAt,
                amount: expense.amount,
                source: 'Driver',
                receiptPhoto: expense.slipPhoto,
                createdBy: req.user._id
            });

            // 2. Add to verified parking entries in Attendance
            attendance.parking.push({
                amount: expense.amount,
                slipPhoto: expense.slipPhoto
            });
            attendance.punchOut.tollParkingAmount = (attendance.punchOut.tollParkingAmount || 0) + expense.amount;
        }
    }

    await attendance.save();
    res.json({ message: `Expense ${status} successfully`, attendance });
});

// @desc    Add driver advance
// @route   POST /api/admin/advances
// @access  Private/Admin
const addAdvance = asyncHandler(async (req, res) => {
    const { driverId, companyId, amount, remark, date } = req.body;

    const driver = await User.findById(driverId);
    if (driver && driver.isFreelancer) {
        return res.status(400).json({ message: 'Advances cannot be recorded for freelancer drivers' });
    }

    const advance = await Advance.create({
        driver: driverId,
        company: companyId,
        amount: Number(amount),
        remark: remark || 'Advance Payment',
        date: date || new Date(),
        status: 'Pending',
        createdBy: req.user._id
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

    const advances = await Advance.find(query)
        .populate({
            path: 'driver',
            match: { isFreelancer: { $ne: true } },
            select: 'name mobile isFreelancer'
        })
        .sort({ date: -1 });

    // Filter out results where driver did not match (is a freelancer)
    const filteredAdvances = advances.filter(adv => adv.driver);

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

        // 2. Fetch all completed attendance records for earnings
        const attendance = await Attendance.find(attendanceQuery);

        // 3. Fetch all advances
        const advances = await Advance.find(advanceQuery);

        const totalEarned = attendance.reduce((sum, att) => {
            const wage = att.dailyWage || driver.dailyWage || 500;
            const bonuses = (att.punchOut?.allowanceTA || 0) +
                (att.punchOut?.nightStayAmount || 0) +
                (att.outsideTrip?.bonusAmount || 0);
            return sum + wage + bonuses;
        }, 0);

        const totalAdvances = advances.reduce((sum, adv) => sum + (adv.amount || 0), 0);
        const totalRecovered = advances.reduce((sum, adv) => sum + (adv.recoveredAmount || 0), 0);
        const pendingAdvance = totalAdvances - totalRecovered;

        return {
            driverId: driver._id,
            name: driver.name,
            mobile: driver.mobile,
            totalEarned,
            totalAdvances,
            totalRecovered,
            pendingAdvance,
            netPayable: totalEarned - pendingAdvance,
            workingDays: attendance.length
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

    const userExists = await User.findOne({ $or: [{ mobile }, { username }] });
    if (userExists) {
        console.log('EXECUTIVE CREATION FAILED: User already exists', { mobile, username });
        return res.status(400).json({ message: 'User already exists with this mobile or username' });
    }

    const executive = await User.create({
        name,
        mobile,
        username,
        password,
        role: 'Executive'
    });
    console.log('EXECUTIVE CREATED SUCCESSFULLY:', executive._id);

    res.status(201).json({
        _id: executive._id,
        name: executive.name,
        mobile: executive.mobile,
        username: executive.username,
        role: executive.role
    });
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
    const { vehicleId, companyId, driver, date, amount, location, remark } = req.body;

    const parking = await Parking.create({
        vehicle: vehicleId,
        company: companyId,
        driver,
        date: date || new Date(),
        amount: Number(amount),
        location: location || 'Not Specified',
        remark,
        source: 'Admin',
        createdBy: req.user._id
    });

    res.status(201).json(parking);
});

// @desc    Get all parking entries for a company
// @route   GET /api/admin/parking/:companyId
// @access  Private/AdminOrExecutive
const getParkingEntries = asyncHandler(async (req, res) => {
    const parking = await Parking.find({ company: req.params.companyId })
        .populate('vehicle', 'carNumber model')
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
// @access  Private/Admin
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

// @desc    Get Staff Attendance Reports
// @route   GET /api/admin/staff-attendance/:companyId
// @access  Private/Admin
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
    getAllExecutives,
    createExecutive,
    deleteExecutive,
    addParkingEntry,
    getParkingEntries,
    deleteParkingEntry,
    getPendingParkingExpenses,
    getAllStaff,
    createStaff,
    getStaffAttendanceReports
};
