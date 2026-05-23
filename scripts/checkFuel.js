const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Vehicle = require('../src/models/Vehicle');
const Company = require('../src/models/Company');
const User = require('../src/models/User');
const Attendance = require('../src/models/Attendance');
const Fuel = require('../src/models/Fuel');

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const aprilStart = new Date(2026, 3, 1);
        const aprilEnd = new Date(2026, 4, 0, 23, 59, 59);

        const aprilEntries = await Fuel.find({ date: { $gte: aprilStart, $lte: aprilEnd } });
        const totalAmt = aprilEntries.reduce((s, e) => s + e.amount, 0);
        console.log(`--- APRIL 2026 DIAGNOSTICS ---`);
        console.log(`Total Entries: ${aprilEntries.length}`);
        console.log(`Total Amount (Sum): ${totalAmt}`);

        // Find duplicates in April
        const dupCheck = {};
        let dups = 0;
        aprilEntries.forEach(e => {
            const key = `${e.vehicle}_${e.date.toISOString()}_${e.amount}_${e.odometer}`;
            if (dupCheck[key]) dups++;
            else dupCheck[key] = true;
        });
        console.log(`Potential Duplicates: ${dups}`);

        const badEntries = await Fuel.find({ distance: { $gt: 5000 } });
        console.log('--- ABNORMAL FUEL ENTRIES (Distance > 5000) ---');
        badEntries.forEach(e => {
            console.log(`[${e.date.toISOString().split('T')[0]}] Car ID: ${e.vehicle} | Dist: ${e.distance} | Odo: ${e.odometer}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
