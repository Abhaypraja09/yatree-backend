const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Advance = require('../models/Advance');
const Parking = require('../models/Parking');
const Loan = require('../models/Loan');
const { DateTime } = require('luxon');
const DASHBOARD_CACHE = require('../utils/cache');

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
    const companyId = driver.company?._id || driver.company;
    logToFile(`getDriverDashboard - User: ${req.user._id}, Company: ${companyId}`);

    // 1. Fetch available vehicles of this company
    // First, identify vehicles currently in use by OTHER drivers
    const activeShifts = await Attendance.find({
        status: 'incomplete',
        company: companyId,
        driver: { $ne: req.user._id },
        date: today // Only exclude vehicles with active shifts FROM TODAY
    }).select('vehicle');
    const occupiedVehicleIds = activeShifts.map(a => a.vehicle.toString());

    const availableVehicles = await Vehicle.find({
        $or: [
            { company: companyId },
            { company: companyId.toString() }
        ],
        status: 'active',
        isOutsideCar: { $ne: true },
        _id: { $nin: occupiedVehicleIds },
        $or: [
            { currentDriver: null },
            { currentDriver: req.user._id }
        ]
    }).select('carNumber model carType currentDriver');

    logToFile(`getDriverDashboard - User: ${req.user._id}, Comp: ${companyId}, Found: ${availableVehicles.length}`);
    if (availableVehicles.length === 0) {
        logToFile(`WARNING: No vehicles found for company ${companyId}. Check if isOutsideCar filter is too strict.`);
    }

    // 2. Fetch latest attendance records
    // We want the absolutely most relevant one first.
    // First, check for any INCOMPLETE shift (doesn't matter when it started)
    let attendance = await Attendance.findOne({
        driver: req.user._id,
        status: 'incomplete'
    }).sort({ createdAt: -1 }).populate('vehicle', 'carNumber model');

    let effectiveStatus = 'approved';

    if (attendance) {
        // Driver has an active shift
        effectiveStatus = 'active';

        // SYNC: Ensure driver's DB status is 'active' if we found an incomplete shift
        if (driver.tripStatus !== 'active') {
            logToFile(`getDriverDashboard - SYNC: Setting driver ${driver._id} status to active because incomplete shift ${attendance._id} was found.`);
            driver.tripStatus = 'active';
            await driver.save();
        }
    } else {
        // No active shift, check for the latest completed one
        attendance = await Attendance.findOne({
            driver: req.user._id,
            status: 'completed'
        }).sort({ createdAt: -1 }).populate('vehicle', 'carNumber model');

        if (attendance) {
            if (attendance.date === today) {
                // Shift was completed today
                // If admin didn't explicitly approve a new trip yet, keep it as completed
                if (driver.tripStatus === 'approved') {
                    effectiveStatus = 'approved';
                } else if (driver.tripStatus === 'pending_approval') {
                    effectiveStatus = 'pending_approval';
                } else {
                    effectiveStatus = 'completed';
                }
            } else {
                // Shift was from a previous day, allow a new one
                effectiveStatus = 'approved';
            }
        } else {
            // No attendance history at all
            effectiveStatus = 'approved';
        }
    }

    logToFile(`getDriverDashboard - Final Status: ${effectiveStatus}, Current Car: ${attendance?.vehicle?.carNumber || 'None'}`);

    res.json({
        driver: {
            _id: driver._id,
            name: driver.name,
            mobile: driver.mobile,
            company: driver.company,
            tripStatus: effectiveStatus,
            nightStayBonus: driver.nightStayBonus !== undefined ? driver.nightStayBonus : 0,
            sameDayReturnBonus: driver.sameDayReturnBonus !== undefined ? driver.sameDayReturnBonus : 0
        },
        vehicle: (attendance?.status === 'incomplete' ? attendance.vehicle : null) || driver.assignedVehicle || null,
        availableVehicles,
        todayAttendance: (attendance && (attendance.date === today || attendance.status === 'incomplete')) ? attendance : null
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
            // Check if that owner is actually on a trip
            const otherDriverActive = await Attendance.findOne({
                driver: vehicle.currentDriver,
                status: 'incomplete'
            });

            if (otherDriverActive) {
                // NEW: Allow login if the existing shift is from a previous day (Stale Shift)
                if (otherDriverActive.date === today) {
                    return res.status(400).json({ message: 'This vehicle is already in use by another driver today' });
                }
                logToFile(`PunchIn - OVERRIDE: Stale shift ${otherDriverActive._id} from ${otherDriverActive.date} found. Allowing company driver takeover.`);
            }
            // If the other driver is NOT active, we allow takeover
            logToFile(`PunchIn - Vehicle takeover from inactive driver ${vehicle.currentDriver} to ${driver._id}`);
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
        if (Number(km) > (vehicle.lastOdometer || 0)) {
            vehicle.lastOdometer = Number(km);
        }
        await vehicle.save();

        driver.tripStatus = 'active';
        await driver.save();

        DASHBOARD_CACHE.clear(); // Ensure admins see the update immediately

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
        fuelFilled, fuelAmounts, fuelKMs, fuelTypes, fuelPaymentSources,
        remarks, // Duty
        parkingPaid,
        parkingAmounts,
        outsideTripOccurred,
        outsideTripType,
        otherRemarks,
        dutyCount
    } = req.body;

    const selfie = req.files?.['selfie']?.[0]?.path;
    const kmPhoto = req.files?.['kmPhoto']?.[0]?.path;
    const carSelfie = req.files?.['carSelfie']?.[0]?.path;

    try {
        if (!selfie || !kmPhoto || !carSelfie) {
            return res.status(400).json({ message: 'Selfie, KM photo, and Car selfie are mandatory' });
        }

        // Search for ANY incomplete shift for this driver, regardless of the date
        const attendance = await Attendance.findOne({
            driver: req.user._id,
            status: 'incomplete'
        }).sort({ createdAt: -1 });

        if (!attendance) {
            console.error(`[PunchOut Error] No active shift found for driver ${req.user._id} (${req.user.name})`);
            return res.status(400).json({ message: 'No active shift found to punch out. Please refresh your dashboard.' });
        }

        console.log(`[PunchOut] Found active shift ${attendance._id} (Started: ${attendance.date}) for driver ${req.user.name}`);

        // Calculate Dynamic Report Fields from Old UI Inputs

        // 1. Toll / Parking (Sum of all inputs or single input)
        let calculatedParkingTotal = 0;
        if (parkingPaid === 'true') {
            let pAmounts = parkingAmounts;
            if (!Array.isArray(pAmounts)) pAmounts = pAmounts ? [pAmounts] : [];
            calculatedParkingTotal = pAmounts.reduce((sum, val) => sum + (Number(val) || 0), 0);
        }

        // 2. Allowances (TA, Night Stay)
        const driver = await User.findById(req.user._id);
        let calcTA = 0;
        let calcNight = 0;
        if (outsideTripOccurred === 'true' && outsideTripType) {
            // Handle comma-separated values (e.g "Same Day,Night Stay")
            const types = outsideTripType.split(',').map(t => t.trim().toLowerCase());

            if (types.some(t => t.includes('same day') || t.includes('ta') || t.includes('return'))) {
                calcTA = driver.sameDayReturnBonus || 100;
            }
            if (types.some(t => t.includes('night') || t.includes('stay'))) {
                calcNight = driver.nightStayBonus || 0;
            }
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
            let fSources = fuelPaymentSources;

            if (!Array.isArray(amounts)) amounts = amounts ? [amounts] : [];
            if (!Array.isArray(kms)) kms = kms ? [kms] : [];
            if (!Array.isArray(fTypes)) fTypes = fTypes ? [fTypes] : [];
            if (!Array.isArray(fSources)) fSources = fSources ? [fSources] : [];

            // Loop over amounts instead of slips to ensure data is captured
            amounts.forEach((amt, index) => {
                const amount = Number(amt) || 0;
                totalFuelAmount += amount;

                // Try to find matching slip, if any
                const slip = fuelSlips[index];

                fuelData.push({
                    amount: amount,
                    km: Number(kms[index]) || 0,
                    slipPhoto: slip ? slip.path : null,
                    slipPhoto: slip ? slip.path : null,
                    fuelType: fTypes[index] || 'Diesel',
                    paymentSource: fSources[index] || 'Office'
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

        // Parking logic (Moved to Pending Expenses for Admin Approval)
        if (parkingPaid === 'true') {
            const parkingSlips = req.files?.['parkingSlips'] || [];
            let amounts = parkingAmounts;
            if (!Array.isArray(amounts)) {
                amounts = amounts ? [amounts] : [];
            }

            // Loop over amounts and add to PENDING expenses
            amounts.forEach((amt, index) => {
                const amount = Number(amt) || 0;
                const slip = parkingSlips[index];

                attendance.pendingExpenses.push({
                    type: 'parking',
                    amount: amount,
                    slipPhoto: slip ? slip.path : null,
                    status: 'pending',
                    paymentSource: 'Office' // Default, consistent with addExpense
                });
            });
        }

        // attendance.parking = parkingData; // REMOVED: Do not auto-approve
        // attendance.punchOut.tollParkingAmount = length > 0... // REMOVED: Should be calculated from approved only
        attendance.punchOut.tollParkingAmount = 0; // Reset or keep 0 until approved logic handles it (or separate toll)

        const tripTypes = (outsideTripType || '').split(',');
        const allowanceTAAmount = tripTypes.includes('Same Day') ? (driver.sameDayReturnBonus !== undefined ? driver.sameDayReturnBonus : 100) : 0;
        const nightStayAmount = tripTypes.includes('Night Stay') ? (driver.nightStayBonus !== undefined ? driver.nightStayBonus : 0) : 0;

        attendance.punchOut.allowanceTA = allowanceTAAmount;
        attendance.punchOut.nightStayAmount = nightStayAmount;

        attendance.outsideTrip = {
            occurred: outsideTripOccurred === 'true',
            tripType: outsideTripType || null,
            bonusAmount: allowanceTAAmount + nightStayAmount
        };

        // Calculate Total KM
        const totalKM = Number(km) - attendance.punchIn.km;
        if (totalKM < 0) {
            return res.status(400).json({ message: 'Punch out KM cannot be less than punch in KM' });
        }

        attendance.totalKM = totalKM;
        attendance.status = 'completed';
        attendance.dutyCount = 1; // Force 1 duty for now to solve 'five options' issue

        await attendance.save();

        // --- NEW: Automatically create an Advance record for the daily wage ---
        // REMOVED: This was causing salary to be treated as a debt (Advance).
        // Salary should only be calculated in the Ledger, not stored as an Advance.
        // --- End of NEW logic ---

        // Mark user status completed (Shows Working Closed screen)
        driver.tripStatus = 'completed';
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

        DASHBOARD_CACHE.clear(); // Critical: Ensure active fleet count decreases immediately

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
        const { types, amounts, kms, fuelTypes, fuelQuantities, fuelRates, paymentSources } = req.body;
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
        let sourcesArr = paymentSources;

        if (!Array.isArray(typesArr)) typesArr = typesArr ? [typesArr] : [];

        console.log('--- Add Expense Debug ---');
        console.log('Files:', files.map(f => ({ field: f.fieldname, name: f.originalname, path: f.path })));
        console.log('Body:', { types: typesArr, amounts: amountsArr });
        if (!Array.isArray(amountsArr)) amountsArr = amountsArr ? [amountsArr] : [];
        if (!Array.isArray(kmsArr)) kmsArr = kmsArr ? [kmsArr] : [];
        if (!Array.isArray(fuelsT)) fuelsT = fuelsT ? [fuelsT] : [];
        if (!Array.isArray(quantitiesArr)) quantitiesArr = quantitiesArr ? [quantitiesArr] : [];
        if (!Array.isArray(ratesArr)) ratesArr = ratesArr ? [ratesArr] : [];
        if (!Array.isArray(sourcesArr)) sourcesArr = sourcesArr ? [sourcesArr] : [];

        typesArr.forEach((type, index) => {
            const fieldName = `slip_${index}`;
            let file = files.find(f => f.fieldname === fieldName);

            // Fallback 1: Check for 'slip' or 'image' if single entry
            if (!file && typesArr.length === 1 && files.length > 0) {
                file = files.find(f => f.fieldname === 'slip' || f.fieldname === 'image' || f.fieldname === 'file' || f.fieldname === 'photo');
                if (!file && files.length === 1) file = files[0];
            }

            // Fallback 2: Check for array uploads (fuelSlips / parkingSlips)
            if (!file) {
                if (type === 'fuel') {
                    const fuelFiles = files.filter(f => f.fieldname === 'fuelSlips');
                    const fuelIndex = typesArr.slice(0, index).filter(t => t === 'fuel').length;
                    file = fuelFiles[fuelIndex];
                } else if (type === 'parking') {
                    const parkingFiles = files.filter(f => f.fieldname === 'parkingSlips');
                    const parkingIndex = typesArr.slice(0, index).filter(t => t === 'parking').length;
                    file = parkingFiles[parkingIndex];
                }
            }

            attendance.pendingExpenses.push({
                type,
                fuelType: (['fuel', 'other', 'wash', 'puncture', 'tissue', 'water'].includes(type)) ? (fuelsT[index] || (type === 'fuel' ? 'Diesel' : (type === 'wash' ? 'Wash' : (type === 'puncture' ? 'Puncture' : (type === 'tissue' ? 'Tissue' : (type === 'water' ? 'Water' : 'Other')))))) : null,
                amount: Number(amountsArr[index]),
                quantity: type === 'fuel' ? (Number(quantitiesArr[index]) || 0) : 0,
                rate: type === 'fuel' ? (Number(ratesArr[index]) || 0) : 0,
                km: Number(kmsArr[index]) || 0,
                slipPhoto: file ? file.path : null, // Slip is now optional
                paymentSource: sourcesArr[index] || 'Office',
                status: 'pending'
            });
        });

        await attendance.save();
        DASHBOARD_CACHE.clear(); // Ensure expenses reflect in live feed stats

        // Update vehicle lastOdometer if any KM provided in expenses
        if (kmsArr && kmsArr.length > 0) {
            const maxKM = Math.max(...kmsArr.map(k => Number(k) || 0));
            if (maxKM > 0) {
                const vehicle = await Vehicle.findById(attendance.vehicle);
                if (vehicle && maxKM > (vehicle.lastOdometer || 0)) {
                    vehicle.lastOdometer = maxKM;
                    await vehicle.save();
                }
            }
        }

        res.status(201).json({ message: 'Expenses submitted for approval', attendance });
    } catch (error) {
        console.error("AddExpense Error:", error);
        res.status(500).json({ message: 'Server error processing expense', error: error.message });
    }
};

// @desc    Get driver duty history, salary and advances
// @route   GET /api/driver/ledger?month=2&year=2026
// @access  Private/Driver
const getDriverLedger = async (req, res) => {
    try {
        const driverId = req.user._id;
        const { month, year } = req.query;

        // Build date filter (if month+year provided, filter by that month)
        let dateFilter = {};
        let startOfMonth, endOfMonth;
        if (month && year) {
            startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
            endOfMonth = new Date(parseInt(year), parseInt(month), 0);
            endOfMonth.setHours(23, 59, 59, 999);
            // Attendance uses string date 'YYYY-MM-DD'
            const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDay = endOfMonth.getDate();
            const endStr = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
            dateFilter = { date: { $gte: startStr, $lte: endStr } };
        }

        // 1. Fetch completed attendance (filtered by month if provided)
        const attendance = await Attendance.find({
            driver: driverId,
            status: 'completed',
            ...dateFilter
        }).populate('vehicle', 'carNumber').sort({ date: -1 });

        // 2. Fetch advances (filtered by month if provided)
        const advanceFilter = {
            driver: driverId,
            remark: { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ }
        };
        if (month && year) {
            advanceFilter.date = { $gte: startOfMonth, $lte: endOfMonth };
        }
        const advances = await Advance.find(advanceFilter).sort({ date: -1 });

        // 3. Fetch approved Parking entries (filtered by month if provided)
        const parkingFilter = {
            $or: [
                { driverId: driverId },
                { driver: { $regex: new RegExp(`^${req.user.name}$`, 'i') } }
            ],
            serviceType: { $ne: 'car_service' }
        };
        if (month && year) {
            parkingFilter.date = { $gte: startOfMonth, $lte: endOfMonth };
        }
        const parkingEntries = await Parking.find(parkingFilter).populate('vehicle', 'carNumber').sort({ date: -1 });

        console.log(`[DEBUG] Driver Ledger: ID=${driverId}, Month=${month || 'all'}, Year=${year || 'all'}`);
        console.log(`[DEBUG] Found ${attendance.length} attendance records`);
        console.log(`[DEBUG] Found ${parkingEntries.length} admin parking entries`);

        // 4. Fetch Loans
        const loans = await Loan.find({
            driver: driverId,
            status: { $ne: 'Cancelled' }
        }).sort({ startDate: 1 });

        // Calculate Summary
        let totalEarned = 0;
        let workingDays = 0;

        const ledgerMap = new Map();
        const attendanceDatesUsedForParking = new Set();

        // 1. Process Attendance
        attendance.forEach(att => {
            const dateKey = att.date; // YYYY-MM-DD
            const wage = Number(att.dailyWage) || 0;
            
            let sameDayReturn = (Number(att.punchOut?.allowanceTA) || 0);
            let nightStay = (Number(att.punchOut?.nightStayAmount) || 0);
            let otherBonuses = 0;
            
            if (att.outsideTrip && att.outsideTrip.bonusAmount !== undefined && att.outsideTrip.bonusAmount > 0) {
                // Total bonus is bonusAmount, extra is (bonusAmount - TA - Night)
                otherBonuses = Math.max(0, Number(att.outsideTrip.bonusAmount) - sameDayReturn - nightStay);
            }
            const bonuses = sameDayReturn + nightStay + otherBonuses;

            // External Parking logic (only once per day)
            let finalParkingForDay = 0;
            if (!attendanceDatesUsedForParking.has(dateKey)) {
                finalParkingForDay = parkingEntries
                    .filter(p => DateTime.fromJSDate(p.date).setZone('Asia/Kolkata').toFormat('yyyy-MM-dd') === dateKey)
                    .reduce((s, p) => s + (Number(p.amount) || 0), 0);
                attendanceDatesUsedForParking.add(dateKey);
            }

            if (ledgerMap.has(dateKey)) {
                const existing = ledgerMap.get(dateKey);
                // Aggregation: If multiple shifts, append vehicle, sum KM
                if (att.vehicle?.carNumber && !existing.vehicle.includes(att.vehicle.carNumber)) {
                    existing.vehicle += `, ${att.vehicle.carNumber}`;
                }
                existing.totalKM += (att.totalKM || 0);
                
                // Aggregation: Use MAX wage and MAX bonus for the day 
                if (wage > existing.dailyWage) existing.dailyWage = wage;
                if (sameDayReturn > (existing.sameDayReturn || 0)) existing.sameDayReturn = sameDayReturn;
                if (nightStay > (existing.nightStay || 0)) existing.nightStay = nightStay;
                if (otherBonuses > (existing.otherBonuses || 0)) existing.otherBonuses = otherBonuses;
                if (bonuses > existing.bonuses) existing.bonuses = bonuses;
                // Note: parking is already the daily total from external collection
            } else {
                workingDays += 1;
                ledgerMap.set(dateKey, {
                    _id: att._id,
                    date: att.date,
                    vehicle: att.vehicle?.carNumber || 'N/A',
                    dailyWage: wage,
                    sameDayReturn: sameDayReturn,
                    nightStay: nightStay,
                    otherBonuses: otherBonuses,
                    bonuses: bonuses,
                    parking: finalParkingForDay,
                    totalKM: att.totalKM || 0,
                    status: att.status,
                    type: 'duty'
                });
            }
        });

        // 2. Add Standalone parking entries
        const attendanceDates = new Set(attendance.map(a => a.date));
        parkingEntries.forEach(p => {
            const pDateKey = DateTime.fromJSDate(p.date).setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
            if (!attendanceDates.has(pDateKey)) {
                const amount = Number(p.amount) || 0;
                if (ledgerMap.has(pDateKey)) {
                    ledgerMap.get(pDateKey).parking += amount;
                } else {
                    ledgerMap.set(pDateKey, {
                        _id: p._id,
                        date: pDateKey,
                        vehicle: p.vehicle?.carNumber || 'N/A',
                        dailyWage: 0,
                        bonuses: 0,
                        parking: amount,
                        totalKM: 0,
                        status: 'Approved',
                        type: 'duty'
                    });
                }
            }
        });

        // Final Calculation (Post-Aggregation)
        totalEarned = 0;
        ledgerMap.forEach(entry => {
            totalEarned += (entry.dailyWage + entry.bonuses + entry.parking);
        });

        // Convert Map back to Array and Sort
        const combinedHistory = Array.from(ledgerMap.values()).sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        const totalAdvances = advances.reduce((sum, adv) => sum + (adv.amount || 0), 0);
        const totalRecovered = advances.reduce((sum, adv) => sum + (adv.recoveredAmount || 0), 0);
        const pendingAdvance = totalAdvances - totalRecovered;

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
                        const repayment = (loan.repayments || []).find(r => r.month === selM && r.year === selY);
                        totalEMI += repayment ? (Number(repayment.amount) || 0) : (Number(loan.monthlyEMI) || 0);
                    }
                }
            });
        }

        res.json({
            summary: {
                totalEarned,
                workingDays,
                totalAdvances,
                totalRecovered,
                pendingAdvance,
                totalEMI,
                netPayable: totalEarned - pendingAdvance - totalEMI
            },
            history: combinedHistory,
            advances: advances.map(adv => ({
                _id: adv._id,
                amount: adv.amount,
                date: adv.date,
                recovered: adv.recoveredAmount,
                status: adv.status,
                remark: adv.remark
            })),
            loans: loans || []
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
