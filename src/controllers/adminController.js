const mongoose = require('mongoose');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Company = require('../models/Company');
const Attendance = require('../models/Attendance');
const BorderTax = require('../models/BorderTax');
const { DateTime } = require('luxon');
const asyncHandler = require('express-async-handler');

// @desc    Create a new driver
// @route   POST /api/admin/drivers
// @access  Private/Admin
// @access  Private/Admin
const createDriver = async (req, res, next) => {
    try {
        const { name, mobile, password, companyId, isFreelancer, licenseNumber, username } = req.body;
        const freelancer = isFreelancer === 'true' || isFreelancer === true;

        if (!name || !mobile || (!freelancer && !password) || !companyId || companyId === 'undefined') {
            return res.status(400).json({ message: 'Please provide all required fields: name, mobile, password (for regular drivers), companyId' });
        }

        const userExists = await User.findOne({ $or: [{ mobile }, { username: username || null }] });
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
            licenseNumber
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
    const { carNumber, model, permitType, companyId, carType, isOutsideCar, dutyAmount, fastagNumber, fastagBalance, fastagBank, driverName, dutyType, ownerName } = req.body;

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

    const totalVehicles = await Vehicle.countDocuments({ company: companyId });
    const totalDrivers = await User.countDocuments({ company: companyId, role: 'Driver' });

    const attendanceToday = await Attendance.find({
        company: companyId,
        date: targetDate
    }).populate('driver', 'name mobile').populate('vehicle', 'carNumber');

    // Document Expiry Alerts - Relative to the Selected Dashboard Date
    const baseDate = DateTime.fromFormat(targetDate, 'yyyy-MM-dd').setZone('Asia/Kolkata').startOf('day');
    const alertThreshold = baseDate.plus({ days: 30 });

    const vehiclesWithExpiringDocs = await Vehicle.find({
        company: companyId,
        'documents.expiryDate': { $lte: alertThreshold.toJSDate() }
    }).select('carNumber documents');

    const driversWithExpiringDocs = await User.find({
        company: companyId,
        role: 'Driver',
        'documents.expiryDate': { $lte: alertThreshold.toJSDate() }
    }).select('name documents');

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

    const uniqueDriversToday = new Set(attendanceToday.filter(a => a.punchIn && a.punchIn.time).map(a => a.driver?._id?.toString()));
    const punchOutList = attendanceToday.filter(a => a.punchOut && a.punchOut.time);

    const fastagData = await Vehicle.aggregate([
        { $match: { company: new mongoose.Types.ObjectId(companyId) } },
        { $group: { _id: null, total: { $sum: '$fastagBalance' } } }
    ]);
    const totalFastagBalance = fastagData[0]?.total || 0;

    res.json({
        date: targetDate,
        totalVehicles,
        totalDrivers,
        countPunchIns: uniqueDriversToday.size,
        countPunchOuts: punchOutList.length,
        totalFastagBalance,
        attendanceDetails: attendanceToday,
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
    const pageSize = 10;
    const page = Number(req.query.pageNumber) || 1;

    try {
        const count = await User.countDocuments({ company: companyId, role: 'Driver' });
        let drivers = await User.find({ company: companyId, role: 'Driver' })
            .populate('assignedVehicle', 'carNumber model')
            .limit(pageSize)
            .skip(pageSize * (page - 1))
            .sort({ createdAt: -1 });

        // For active freelancers, fetch their current punch-in info
        const driversList = await Promise.all(drivers.map(async (d) => {
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

        console.log(`Found ${drivers.length} drivers for company ${companyId}`);
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

    if (!usePagination) {
        const vehicles = await fetchVehiclesAndSync({ company: companyId });
        return res.json({ vehicles });
    }

    const count = await Vehicle.countDocuments({ company: companyId });
    const vehicles = await fetchVehiclesAndSync({ company: companyId }); // Using the same sync logic for paginated as well
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
    const vehicle = await Vehicle.findById(req.params.id);

    if (vehicle) {
        vehicle.carNumber = req.body.carNumber || vehicle.carNumber;
        vehicle.model = req.body.model || vehicle.model;
        vehicle.permitType = req.body.permitType || vehicle.permitType;

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

    // 1. Fetch Attendance Reports ( Staff + Freelancers + Outside Cars)
    const attendance = await Attendance.find(query)
        .populate('driver', 'name mobile isFreelancer')
        .populate('vehicle', 'carNumber model isOutsideCar carType dutyAmount fastagNumber fastagBalance')
        .sort({ date: -1, createdAt: -1 });

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

    res.json({
        attendance,
        fastagRecharges,
        borderTax
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
    const { driverId, vehicleId, km, time } = req.body;

    const driver = await User.findById(driverId);
    const vehicle = await Vehicle.findById(vehicleId);

    if (!driver || !vehicle) {
        return res.status(404).json({ message: 'Driver or Vehicle not found' });
    }

    if (!driver.isFreelancer) {
        return res.status(400).json({ message: 'This is not a freelancer driver' });
    }

    // Create attendance record
    const today = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');

    // Check if already punched in
    const existing = await Attendance.findOne({ driver: driverId, date: today, status: 'incomplete' });
    if (existing) {
        return res.status(400).json({ message: 'Driver is already punched in' });
    }

    const attendance = new Attendance({
        driver: driverId,
        company: driver.company,
        vehicle: vehicleId,
        date: today,
        punchIn: {
            km: km || 0,
            time: time ? new Date(time) : new Date(),
        },
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
    const { driverId, km, time, fuelAmount, parkingAmount, review } = req.body;

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
    deleteBorderTax
};
