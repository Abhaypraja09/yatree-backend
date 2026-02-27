const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const Vehicle = require('../models/Vehicle');
const mongoose = require('mongoose');

// @desc    Create a new event
// @route   POST /api/admin/events
// @access  Private/Admin
const createEvent = asyncHandler(async (req, res) => {
    const { name, companyId, client, date, location, description } = req.body;

    if (!name || !companyId || !date) {
        return res.status(400).json({ message: 'Please provide name, companyId and date' });
    }

    const event = new Event({
        name,
        company: companyId,
        client,
        date: new Date(date),
        location,
        description
    });

    await event.save();
    res.status(201).json(event);
});

// @desc    Get all events for a company
// @route   GET /api/admin/events/:companyId
// @access  Private/Admin
const getEvents = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { from, to } = req.query;

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

    const events = await Event.aggregate([
        { $match: matchQuery },
        {
            $lookup: {
                from: 'vehicles',
                localField: '_id',
                foreignField: 'eventId',
                as: 'records'
            }
        },
        {
            $addFields: {
                totalAmount: { $sum: '$records.dutyAmount' },
                recordCount: { $size: '$records' }
            }
        },
        { $project: { records: 0 } },
        { $sort: { date: -1 } }
    ]);

    res.json(events);
});

// @desc    Get event details including cars/duties
// @route   GET /api/admin/events/details/:eventId
// @access  Private/Admin
const getEventDetails = asyncHandler(async (req, res) => {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }

    // Find all "records" (Vehicles where isOutsideCar is true and eventId matches)
    const records = await Vehicle.find({ eventId, isOutsideCar: true }).sort({ createdAt: -1 });

    const totalAmount = records.reduce((sum, r) => sum + (r.dutyAmount || 0), 0);

    res.json({
        event: {
            ...event.toObject(),
            totalAmount // Dynamic calculate
        },
        records
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
        // Also remove eventId from linked vehicles? 
        // Or delete the linked vehicles if they are strictly "event records"?
        // The user said "jitni bhi car lete hu muje usme iski report... aa jye"
        // Let's delete the records too if they are outside cars created specifically for this event.
        await Vehicle.deleteMany({ eventId: event._id, isOutsideCar: true });
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
