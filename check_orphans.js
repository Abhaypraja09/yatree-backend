const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Vehicle = require('./src/models/Vehicle');
    const Event = require('./src/models/Event');
    
    const vehicles = await Vehicle.find({ isOutsideCar: true, eventId: { $exists: true } }).lean();
    const eventIds = vehicles.map(v => v.eventId).filter(id => id);
    const events = await Event.find({ _id: { $in: eventIds } }).lean();
    
    const existingEventIds = new Set(events.map(e => e._id.toString()));
    const orphanedVehicles = vehicles.filter(v => v.eventId && !existingEventIds.has(v.eventId.toString()));
    
    console.log('Orphaned Vehicles Count:', orphanedVehicles.length);
    console.log(JSON.stringify(orphanedVehicles.slice(0, 3), null, 2));
    
    // Auto-fix orphaned vehicles by unsetting property if they have an event name in property, or deleting them.
    // The user wants them gone from outside cars completely.
    // If the event was deleted, they should be deleted!
    const deleteRes = await Vehicle.deleteMany({ _id: { $in: orphanedVehicles.map(v => v._id) } });
    console.log('Deleted orphaned vehicles:', deleteRes.deletedCount);
    
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
