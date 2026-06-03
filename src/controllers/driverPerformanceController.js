const asyncHandler = require('express-async-handler');
const DriverPerformance = require('../models/DriverPerformance');

// @desc    Add a performance record
// @route   POST /api/driver-performance
// @access  Private/Admin
const addPerformanceRecord = asyncHandler(async (req, res) => {
    const { driverId, date, incidentType, remarks } = req.body;

    if (!driverId || !date || !incidentType || !remarks) {
        res.status(400);
        throw new Error('Please provide all required fields');
    }

    const performanceRecord = await DriverPerformance.create({
        driverId,
        date,
        incidentType,
        remarks,
        recordedBy: req.user._id
    });

    if (performanceRecord) {
        res.status(201).json(performanceRecord);
    } else {
        res.status(400);
        throw new Error('Invalid performance record data');
    }
});

// @desc    Get performance records for a company (optional filter by month/year)
// @route   GET /api/driver-performance/company/:companyId
// @access  Private/Admin
const getCompanyPerformance = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { month, year } = req.query;

    const User = require('../models/User');
    const drivers = await User.find({ company: companyId }).select('_id');
    const driverIds = drivers.map(d => d._id);

    let query = { driverId: { $in: driverIds } };

    if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of the month

        query.date = {
            $gte: startDate,
            $lte: endDate
        };
    }

    const records = await DriverPerformance.find(query)
        .populate('driverId', 'name mobile profilePhoto')
        .populate('recordedBy', 'name')
        .sort({ date: -1 });

    res.json(records);
});

// @desc    Update a performance record
// @route   PUT /api/driver-performance/:id
// @access  Private/Admin
const updatePerformanceRecord = asyncHandler(async (req, res) => {
    const { driverId, date, incidentType, remarks } = req.body;
    const record = await DriverPerformance.findById(req.params.id);

    if (record) {
        record.driverId = driverId || record.driverId;
        record.date = date || record.date;
        record.incidentType = incidentType || record.incidentType;
        record.remarks = remarks || record.remarks;

        const updatedRecord = await record.save();
        res.json(updatedRecord);
    } else {
        res.status(404);
        throw new Error('Performance record not found');
    }
});

// @desc    Get performance records for a driver (optional filter by month/year)
// @route   GET /api/driver-performance/:driverId
// @access  Private/Admin
const getDriverPerformance = asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    const { month, year } = req.query;

    let query = { driverId };

    if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of the month

        query.date = {
            $gte: startDate,
            $lte: endDate
        };
    }

    const records = await DriverPerformance.find(query)
        .populate('recordedBy', 'name')
        .sort({ date: -1 });

    res.json(records);
});

// @desc    Delete a performance record
// @route   DELETE /api/driver-performance/:id
// @access  Private/Admin
const deletePerformanceRecord = asyncHandler(async (req, res) => {
    const record = await DriverPerformance.findById(req.params.id);

    if (record) {
        await record.deleteOne();
        res.json({ message: 'Performance record removed' });
    } else {
        res.status(404);
        throw new Error('Performance record not found');
    }
});

module.exports = {
    addPerformanceRecord,
    getDriverPerformance,
    getCompanyPerformance,
    updatePerformanceRecord,
    deletePerformanceRecord
};
