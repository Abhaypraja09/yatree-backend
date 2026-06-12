const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Vehicle = require('./src/models/Vehicle');
    
    // Find all outside cars that have an eventId but no property
    const vehicles = await Vehicle.find({ isOutsideCar: true, eventId: { $exists: true } });
    let updatedCount = 0;
    
    for (const v of vehicles) {
        if (!v.property && v.dropLocation) {
            v.property = v.dropLocation;
            await v.save();
            updatedCount++;
        }
    }
    
    console.log(`Updated ${updatedCount} existing outside cars to set property from dropLocation.`);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
