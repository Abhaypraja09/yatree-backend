const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const Vehicle = require('../models/Vehicle');
const mongoose = require('mongoose');

// @desc    Create a new event
// @route   POST /api/admin/events
// @access  Private/Admin
const createEvent = asyncHandler(async (req, res) => {
    const { name, companyId, client, date, location, description, totalRevenue, advanceAmount, amountReceived, status } = req.body;

    if (!name || !companyId || !date) {
        return res.status(400).json({ message: 'Please provide name, companyId and date' });
    }

    const event = new Event({
        name,
        company: companyId,
        client,
        date: new Date(date),
        location,
        description,
        totalRevenue: Number(totalRevenue) || 0,
        amountReceived: Number(amountReceived) || 0,
        advanceAmount: Number(advanceAmount) || 0,
        status: status || 'Upcoming'
    });

    await event.save();
    res.status(201).json(event);
});

// @desc    Get all events for a company
// @route   GET /api/admin/events/:companyId
// @access  Private/Admin
const getEvents = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { from, to, status } = req.query;

    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    let matchQuery = { company: companyObjectId };
    if (from && to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        matchQuery.date = {
            $gte: new Date(from),
            $lte: toDate
        };
    }
    
    if (status && status !== 'All') {
        matchQuery.status = status;
    }

    // Advanced aggregation to count fleet (Attendance + Manual Fleet) vs external (Market) cars
    const events = await Event.aggregate([
        { $match: matchQuery },
        // Lookup Manual Vehicle Records (Both Fleet and External source)
        {
            $lookup: {
                from: 'vehicles',
                localField: '_id',
                foreignField: 'eventId',
                as: 'manualRecords'
            }
        },
        // Lookup Fleet Cars (Attendance)
        {
            $lookup: {
                from: 'attendances',
                localField: '_id',
                foreignField: 'eventId',
                as: 'attendanceRecords'
            }
        },
        {
            $addFields: {
                // External is ONLY manual records with source 'External'
                externalRecords: {
                    $filter: {
                        input: '$manualRecords',
                        as: 'v',
                        cond: { $ne: [ '$$v.vehicleSource', 'Fleet' ] }
                    }
                },
                // Fleet is Attendance + manual records with source 'Fleet'
                fleetManualRecords: {
                    $filter: {
                        input: '$manualRecords',
                        as: 'v',
                        cond: { $eq: [ '$$v.vehicleSource', 'Fleet' ] }
                    }
                }
            }
        },
        {
            $addFields: {
                externalCount: { $size: '$externalRecords' },
                fleetCount: { $add: [ { $size: '$attendanceRecords' }, { $size: '$fleetManualRecords' } ] },
                // Expense is strictly what we pay to external/market cars
                totalExpense: { $sum: '$externalRecords.dutyAmount' }
            }
        },
        { $project: { manualRecords: 0, attendanceRecords: 0, externalRecords: 0, fleetManualRecords: 0 } },
        { $sort: { date: -1 } }
    ]);

    res.json(events);
});

// @desc    Get event details including cars/duties
// @route   GET /api/admin/events/details/:eventId
// @access  Private/Admin
const getEventDetails = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { from, to } = req.query; // Optional time range for duties

    const event = await Event.findById(eventId);
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }

    // 1. Manual Records from Vehicles table
    let vehicleQuery = { eventId };
    if (from && to) {
        vehicleQuery.createdAt = { $gte: new Date(from), $lte: new Date(to) };
    }
    const allManualDuties = await Vehicle.find(vehicleQuery).sort({ createdAt: -1 });

    // Separate based on vehicleSource
    const externalDuties = allManualDuties.filter(d => d.vehicleSource !== 'Fleet');
    const manualFleetDuties = allManualDuties.filter(d => d.vehicleSource === 'Fleet');

    // 2. Real Fleet Duties (Attendance table)
    const Attendance = require('../models/Attendance');
    let fleetQuery = { eventId };
    if (from && to) {
        fleetQuery.date = { $gte: from, $lte: to };
    }
    const realAttendanceDuties = await Attendance.find(fleetQuery).populate('vehicle').populate('driver').sort({ date: -1 });

    // Combine manual fleet and real attendance
    const combinedFleetDuties = [
        ...realAttendanceDuties.map(d => ({ ...d.toObject(), isAttendance: true })),
        ...manualFleetDuties.map(d => ({ ...d.toObject(), isAttendance: false }))
    ].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    const totalExpense = externalDuties.reduce((sum, r) => sum + (r.dutyAmount || 0), 0);

    res.json({
        event: {
            ...event.toObject(),
            totalExpense,
            fleetCount: combinedFleetDuties.length,
            externalCount: externalDuties.length
        },
        externalDuties,
        fleetDuties: combinedFleetDuties
    });
});

// @desc    Update an event
// @route   PUT /api/admin/events/:id
// @access  Private/Admin
const updateEvent = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);

    if (event) {
        event.name = req.body.name || event.name;
        event.client = req.body.client || event.client;
        event.date = req.body.date ? new Date(req.body.date) : event.date;
        event.location = req.body.location || event.location;
        event.description = req.body.description || event.description;
        event.status = req.body.status || event.status;
        
        // New financial fields
        if (req.body.totalRevenue !== undefined) event.totalRevenue = Number(req.body.totalRevenue);
        if (req.body.amountReceived !== undefined) event.amountReceived = Number(req.body.amountReceived);
        if (req.body.advanceAmount !== undefined) event.advanceAmount = Number(req.body.advanceAmount);

        const updatedEvent = await event.save();
        res.json(updatedEvent);
    } else {
        res.status(404).json({ message: 'Event not found' });
    }
});

// @desc    Delete an event
// @route   DELETE /api/admin/events/:id
// @access  Private/Admin
const deleteEvent = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);

    if (event) {
        // Only delete the "OutsideCar" vehicles created for this event
        await Vehicle.deleteMany({ eventId: event._id, isOutsideCar: true });
        
        // Remove eventId from Fleet Attendance instead of deleting attendance
        const Attendance = require('../models/Attendance');
        await Attendance.updateMany({ eventId: event._id }, { $unset: { eventId: "" } });
        
        await event.deleteOne();
        res.json({ message: 'Event and associated records deleted' });
    } else {
        res.status(404).json({ message: 'Event not found' });
    }
});

module.exports = {
    createEvent,
    getEvents,
    getEventDetails,
    updateEvent,
    deleteEvent
};
