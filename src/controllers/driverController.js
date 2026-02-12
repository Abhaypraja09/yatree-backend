const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Advance = require('../models/Advance');
const { DateTime } = require('luxon');

// Helper to get current date in IST (format: YYYY-MM-DD)
const getTodayIST = () => {
    return DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
};

const fs = require('fs');
const path = require('path');
const logToFile = (msg) => {
    try {
        const logPath = path.join(process.cwd(), 'server_debug.log');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] DRIVER_CTRL: ${msg}\n`);
    } catch (e) { }
};

// @desc    Get driver dashboard / assigned vehicle
// @route   GET /api/driver/dashboard
// @access  Private/Driver
const getDriverDashboard = async (req, res) => {
    const driver = await User.findById(req.user._id).populate('assignedVehicle').populate('company');
    const today = getTodayIST();

    // Fetch all vehicles of this company that are NOT currently in use
    const availableVehicles = await Vehicle.find({
        company: driver.company._id,
        currentDriver: null,
        status: 'active',
        isOutsideCar: { $ne: true }
    }).select('carNumber model carType');

    // Fetch latest attendance
    const attendance = await Attendance.findOne({ driver: req.user._id }).sort({ createdAt: -1 })
        .populate('vehicle', 'carNumber model');

    let effectiveStatus = driver.tripStatus || 'approved';

    if (attendance) {
        if (attendance.status === 'incomplete') {
            effectiveStatus = 'active';
        } else if (attendance.status === 'completed') {
            if (attendance.date !== today) {
                // If the last completed shift was from a previous day, allow a new one
                effectiveStatus = 'approved';
            } else if (effectiveStatus !== 'approved') {
                // If it was hoje and they haven't requested a new one, show completed
                effectiveStatus = 'completed';
            }
        }
    } else {
        // No attendance ever
        effectiveStatus = 'approved';
    }

    res.json({
        driver: {
            name: driver.name,
            mobile: driver.mobile,
            company: driver.company,
            tripStatus: effectiveStatus
        },
        vehicle: (attendance?.status === 'incomplete' ? attendance.vehicle : null) || driver.assignedVehicle || null,
        availableVehicles,
        todayAttendance: attendance && attendance.date === today ? attendance : null
    });
};

// @desc    Morning Punch-In
// @route   POST /api/driver/punch-in
// @access  Private/Driver
const punchIn = async (req, res) => {
    try {
        const { km, latitude, longitude, address, vehicleId } = req.body;
        logToFile(`PunchIn - Start - KM: ${km}, Vehicle: ${vehicleId}`);

        const selfie = req.files?.['selfie']?.[0]?.path;
        const kmPhoto = req.files?.['kmPhoto']?.[0]?.path;
        const carSelfie = req.files?.['carSelfie']?.[0]?.path;

        if (!selfie || !kmPhoto || !carSelfie) {
            return res.status(400).json({ message: 'Selfie, KM photo, and Car selfie are mandatory' });
        }

        const today = getTodayIST();
        const driver = await User.findById(req.user._id);

        // Use vehicleId from body OR fallback to assignedVehicle
        const targetVehicleId = vehicleId || driver.assignedVehicle;

        if (!targetVehicleId) {
            return res.status(400).json({ message: 'Please select a vehicle to start your duty' });
        }

        // Check if vehicle is available
        const vehicle = await Vehicle.findById(targetVehicleId);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        if (vehicle.currentDriver && vehicle.currentDriver.toString() !== driver._id.toString()) {
            return res.status(400).json({ message: 'This vehicle is already in use by another driver' });
        }

        if (driver.tripStatus === 'pending_approval') {
            return res.status(400).json({ message: 'Waiting for Admin approval to start new trip' });
        }

        // Check if already an active punch in
        const existingPunch = await Attendance.findOne({ driver: req.user._id, status: 'incomplete' });
        if (existingPunch) {
            return res.status(400).json({ message: 'You have an active shift. Please punch out first.' });
        }

        const attendance = await Attendance.create({
            driver: req.user._id,
            company: driver.company,
            vehicle: targetVehicleId,
            date: today,
            dailyWage: driver.dailyWage || 0, // Capture current wage
            punchIn: {
                km: Number(km),
                selfie: selfie,
                kmPhoto: kmPhoto,
                carSelfie: carSelfie,
                time: new Date(),
                location: { latitude, longitude, address }
            }
        });

        // Update vehicle status
        vehicle.currentDriver = driver._id;
        await vehicle.save();

        // Update driver trip status
        driver.tripStatus = 'active';
        await driver.save();

        res.status(201).json({ message: 'Punched in successfully', attendance });
    } catch (error) {
        logToFile(`PunchIn Error: ${error.message}`);
        console.error('PunchIn Error:', error);
        res.status(500).json({ message: 'Server error during punch in', error: error.message });
    }
};

// @desc    Night Punch-Out
// @route   POST /api/driver/punch-out
// @access  Private/Driver
const punchOut = async (req, res) => {
    const {
        km, latitude, longitude, address,
        fuelFilled, fuelAmounts, fuelKMs, fuelTypes,
        remarks, // Duty
        parkingPaid,
        parkingAmounts,
        outsideTripOccurred,
        outsideTripType,
        otherRemarks
    } = req.body;

    const selfie = req.files?.['selfie']?.[0]?.path;
    const kmPhoto = req.files?.['kmPhoto']?.[0]?.path;
    const carSelfie = req.files?.['carSelfie']?.[0]?.path;

    try {
        if (!selfie || !kmPhoto || !carSelfie) {
            return res.status(400).json({ message: 'Selfie, KM photo, and Car selfie are mandatory' });
        }

        const attendance = await Attendance.findOne({ driver: req.user._id, status: 'incomplete' });

        if (!attendance) {
            return res.status(400).json({ message: 'No active shift found to punch out' });
        }

        // Calculate Dynamic Report Fields from Old UI Inputs

        // 1. Toll / Parking (Sum of all inputs or single input)
        let calculatedParkingTotal = 0;
        if (parkingPaid === 'true') {
            let pAmounts = parkingAmounts;
            if (!Array.isArray(pAmounts)) pAmounts = pAmounts ? [pAmounts] : [];
            calculatedParkingTotal = pAmounts.reduce((sum, val) => sum + (Number(val) || 0), 0);
        }

        // 2. Allowances (TA, Night Stay)
        let calcTA = 0;
        let calcNight = 0;
        if (outsideTripOccurred === 'true' && outsideTripType) {
            // Handle comma-separated values (e.g "Same Day,Night Stay")
            const types = outsideTripType.split(',').map(t => t.trim());

            if (types.includes('Same Day')) calcTA = 100;
            if (types.includes('Night Stay')) calcNight = 500;
        }

        attendance.punchOut = {
            km: Number(km),
            selfie: selfie,
            kmPhoto: kmPhoto,
            carSelfie: carSelfie,
            time: new Date(),
            location: { latitude, longitude, address },
            remarks: remarks || '',

            // Calculated/Received fields for Report
            tollParkingAmount: calculatedParkingTotal,
            allowanceTA: calcTA,
            nightStayAmount: calcNight,
            otherRemarks: otherRemarks || ''
        };

        // Fuel logic (Multiple entries)
        let fuelData = attendance.fuel?.entries || [];
        // totalFuelAmount should be the sum of previously approved entries
        let totalFuelAmount = fuelData.reduce((sum, e) => sum + (e.amount || 0), 0);

        if (fuelFilled === 'true') {
            const fuelSlips = req.files?.['fuelSlips'] || [];
            let amounts = fuelAmounts;
            let kms = fuelKMs;
            let fTypes = fuelTypes;

            if (!Array.isArray(amounts)) amounts = amounts ? [amounts] : [];
            if (!Array.isArray(kms)) kms = kms ? [kms] : [];
            if (!Array.isArray(fTypes)) fTypes = fTypes ? [fTypes] : [];

            fuelSlips.forEach((slip, index) => {
                const amount = Number(amounts[index]) || 0;
                totalFuelAmount += amount;
                fuelData.push({
                    amount: amount,
                    km: Number(kms[index]) || 0,
                    slipPhoto: slip.path,
                    fuelType: fTypes[index] || 'Diesel'
                });
            });
        }

        attendance.fuel = {
            filled: fuelData.length > 0,
            amount: totalFuelAmount,
            entries: fuelData,
            km: fuelData.length > 0 ? fuelData[0].km : 0, // Legacy fallback
            slipPhoto: fuelData.length > 0 ? fuelData[0].slipPhoto : null // Legacy fallback
        };

        // Parking logic (Legacy/Slip storage)
        let parkingData = attendance.parking || [];
        // Start with previously approved sums
        let totalParkingAmount = parkingData.reduce((sum, e) => sum + (e.amount || 0), 0);

        if (parkingPaid === 'true') {
            const parkingSlips = req.files?.['parkingSlips'] || [];
            let amounts = parkingAmounts;
            if (!Array.isArray(amounts)) {
                amounts = amounts ? [amounts] : [];
            }

            parkingSlips.forEach((slip, index) => {
                const amount = Number(amounts[index]) || 0;
                totalParkingAmount += amount;
                parkingData.push({
                    amount: amount,
                    slipPhoto: slip.path
                });
            });
        }
        attendance.parking = parkingData;
        attendance.punchOut.tollParkingAmount = totalParkingAmount;

        attendance.outsideTrip = {
            occurred: outsideTripOccurred === 'true',
            tripType: outsideTripType || null,
            bonusAmount: calcTA + calcNight // FIXED: Sum them up
        };

        // Calculate Total KM
        const totalKM = Number(km) - attendance.punchIn.km;
        if (totalKM < 0) {
            return res.status(400).json({ message: 'Punch out KM cannot be less than punch in KM' });
        }

        attendance.totalKM = totalKM;
        attendance.status = 'completed';

        await attendance.save();

        // Mark user status completed (Shows Working Closed screen)
        const driverUser = await User.findById(req.user._id);
        driverUser.tripStatus = 'completed';
        await driverUser.save();

        // Release vehicle
        if (attendance.vehicle) {
            await Vehicle.findByIdAndUpdate(attendance.vehicle, { currentDriver: null });
        }

        res.json({ message: 'Punched out successfully', attendance });
    } catch (error) {
        console.error("PunchOut Error:", error);
        res.status(500).json({ message: 'Server error processing punch out', error: error.message });
    }
};

const requestNewTrip = async (req, res) => {
    try {
        const driver = await User.findById(req.user._id);
        driver.tripStatus = 'approved'; // Auto-approve
        await driver.save();
        res.json({ message: 'Ready for new trip', tripStatus: 'approved' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Add expense (Fuel/Parking) during shift
// @route   POST /api/driver/add-expense
// @access  Private/Driver
const addExpense = async (req, res) => {
    try {
        const { types, amounts, kms, fuelTypes, fuelQuantities, fuelRates } = req.body;
        const files = req.files || [];

        const attendance = await Attendance.findOne({ driver: req.user._id, status: 'incomplete' });
        if (!attendance) {
            return res.status(400).json({ message: 'No active shift found to add expense' });
        }

        let typesArr = types;
        let amountsArr = amounts;
        let kmsArr = kms;
        let fuelsT = fuelTypes;
        let quantitiesArr = fuelQuantities;
        let ratesArr = fuelRates;

        if (!Array.isArray(typesArr)) typesArr = typesArr ? [typesArr] : [];
        if (!Array.isArray(amountsArr)) amountsArr = amountsArr ? [amountsArr] : [];
        if (!Array.isArray(kmsArr)) kmsArr = kmsArr ? [kmsArr] : [];
        if (!Array.isArray(fuelsT)) fuelsT = fuelsT ? [fuelsT] : [];
        if (!Array.isArray(quantitiesArr)) quantitiesArr = quantitiesArr ? [quantitiesArr] : [];
        if (!Array.isArray(ratesArr)) ratesArr = ratesArr ? [ratesArr] : [];

        typesArr.forEach((type, index) => {
            const fieldName = `slip_${index}`;
            const file = files.find(f => f.fieldname === fieldName);

            attendance.pendingExpenses.push({
                type,
                fuelType: (type === 'fuel' || type === 'other') ? (fuelsT[index] || (type === 'fuel' ? 'Diesel' : 'Other')) : null,
                amount: Number(amountsArr[index]),
                quantity: type === 'fuel' ? (Number(quantitiesArr[index]) || 0) : 0,
                rate: type === 'fuel' ? (Number(ratesArr[index]) || 0) : 0,
                km: Number(kmsArr[index]) || 0,
                slipPhoto: file ? file.path : null, // Slip is now optional
                status: 'pending'
            });
        });

        await attendance.save();
        res.status(201).json({ message: 'Expenses submitted for approval', attendance });
    } catch (error) {
        console.error("AddExpense Error:", error);
        res.status(500).json({ message: 'Server error processing expense', error: error.message });
    }
};

// @desc    Get driver duty history, salary and advances
// @route   GET /api/driver/ledger
// @access  Private/Driver
const getDriverLedger = async (req, res) => {
    try {
        const driverId = req.user._id;

        // 1. Fetch all completed attendance
        const attendance = await Attendance.find({
            driver: driverId,
            status: 'completed'
        }).populate('vehicle', 'carNumber').sort({ date: -1 });

        // 2. Fetch all advances
        const advances = await Advance.find({
            driver: driverId
        }).sort({ date: -1 });

        // Calculate Summary
        const summary = attendance.reduce((acc, att) => {
            const wage = att.dailyWage || 0;
            const bonuses = (att.punchOut?.allowanceTA || 0) +
                (att.punchOut?.nightStayAmount || 0) +
                (att.outsideTrip?.bonusAmount || 0);

            acc.totalEarned += (wage + bonuses);
            acc.workingDays += 1;
            return acc;
        }, { totalEarned: 0, workingDays: 0 });

        const totalAdvances = advances.reduce((sum, adv) => sum + (adv.amount || 0), 0);
        const totalRecovered = advances.reduce((sum, adv) => sum + (adv.recoveredAmount || 0), 0);
        const pendingAdvance = totalAdvances - totalRecovered;

        res.json({
            summary: {
                ...summary,
                totalAdvances,
                totalRecovered,
                pendingAdvance,
                netPayable: summary.totalEarned - pendingAdvance
            },
            history: attendance.map(att => ({
                _id: att._id,
                date: att.date,
                vehicle: att.vehicle?.carNumber || 'N/A',
                dailyWage: att.dailyWage || 0,
                bonuses: (att.punchOut?.allowanceTA || 0) + (att.punchOut?.nightStayAmount || 0) + (att.outsideTrip?.bonusAmount || 0),
                totalKM: att.totalKM || 0,
                status: att.status
            })),
            advances: advances.map(adv => ({
                _id: adv._id,
                amount: adv.amount,
                date: adv.date,
                recovered: adv.recoveredAmount,
                status: adv.status,
                remark: adv.remark
            }))
        });
    } catch (error) {
        console.error("Ledger Error:", error);
        res.status(500).json({ message: 'Server error fetching ledger', error: error.message });
    }
};

module.exports = {
    getDriverDashboard,
    punchIn,
    punchOut,
    requestNewTrip,
    addExpense,
    getDriverLedger
};
