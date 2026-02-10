const mongoose = require('mongoose');
const Fuel = require('./src/models/Fuel');
require('dotenv').config();

const fixFuelEntries = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all fuel entries
        const entries = await Fuel.find({}).sort({ vehicle: 1, odometer: 1 });
        console.log(`Found ${entries.length} fuel entries`);

        let updated = 0;
        let vehicleGroups = {};

        // Group by vehicle
        entries.forEach(entry => {
            const vehicleId = entry.vehicle.toString();
            if (!vehicleGroups[vehicleId]) {
                vehicleGroups[vehicleId] = [];
            }
            vehicleGroups[vehicleId].push(entry);
        });

        // Process each vehicle's entries
        for (const vehicleId in vehicleGroups) {
            const vehicleEntries = vehicleGroups[vehicleId];
            console.log(`\nProcessing ${vehicleEntries.length} entries for vehicle ${vehicleId}`);

            for (let i = 0; i < vehicleEntries.length; i++) {
                const entry = vehicleEntries[i];
                let needsUpdate = false;

                // Set default values if missing
                if (!entry.quantity || entry.quantity === 0) {
                    entry.quantity = 0;
                    needsUpdate = true;
                }

                if (!entry.rate || entry.rate === 0) {
                    if (entry.quantity > 0 && entry.amount > 0) {
                        entry.rate = Number((entry.amount / entry.quantity).toFixed(2));
                        needsUpdate = true;
                    } else {
                        entry.rate = 0;
                        needsUpdate = true;
                    }
                }

                // Calculate distance from previous entry
                if (i > 0) {
                    const prevEntry = vehicleEntries[i - 1];
                    const distance = entry.odometer - prevEntry.odometer;

                    if (distance > 0) {
                        entry.distance = distance;

                        // Calculate mileage if quantity is available
                        if (entry.quantity > 0) {
                            entry.mileage = Number((distance / entry.quantity).toFixed(2));
                        } else {
                            entry.mileage = 0;
                        }

                        // Calculate cost per km
                        entry.costPerKm = Number((entry.amount / distance).toFixed(2));
                        needsUpdate = true;
                    }
                } else {
                    // First entry for this vehicle
                    if (!entry.distance) {
                        entry.distance = 0;
                        needsUpdate = true;
                    }
                    if (!entry.mileage) {
                        entry.mileage = 0;
                        needsUpdate = true;
                    }
                    if (!entry.costPerKm) {
                        entry.costPerKm = 0;
                        needsUpdate = true;
                    }
                }

                if (needsUpdate) {
                    await entry.save();
                    updated++;
                    console.log(`  Updated entry ${entry._id}: distance=${entry.distance}, mileage=${entry.mileage}, quantity=${entry.quantity}`);
                }
            }
        }

        console.log(`\n✅ Migration complete! Updated ${updated} entries.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
};

fixFuelEntries();
