const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '../backend/.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
}

const Vehicle = require('../backend/src/models/Vehicle');
const User = require('../backend/src/models/User');
const Attendance = require('../backend/src/models/Attendance');
const Fuel = require('../backend/src/models/Fuel');

async function run() {
    try {
        const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";
        const MONGODB_URI = (process.env.MONGODB_URI || latestAtlasURI).trim();

        console.log('Connecting to:', MONGODB_URI.substring(0, 30) + '...');
        await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 10,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 15000,
        });
        console.log('Connected successfully!');

        // 1. Find the vehicle
        const vehicle = await Vehicle.findOne({ carNumber: /9795/ });
        if (!vehicle) {
            console.log('Vehicle 9795 not found!');
            process.exit(0);
        }
        console.log(`Found Vehicle: ${vehicle.carNumber} (ID: ${vehicle._id}), Company: ${vehicle.company}`);

        // 2. Find attendance for 17th May 2026
        const dateStr = '2026-05-17';
        const attendances = await Attendance.find({ vehicle: vehicle._id, date: dateStr })
            .populate('driver', 'name')
            .populate('company', 'name');
        
        console.log(`--- Attendances for ${dateStr} ---`);
        console.log(`Found ${attendances.length} records`);
        
        for (const att of attendances) {
            console.log(`ID: ${att._id}`);
            console.log(`Driver: ${att.driver?.name} (ID: ${att.driver?._id})`);
            console.log(`Company: ${att.company?.name} (ID: ${att.company?._id})`);
            console.log(`Status: ${att.status}`);
            console.log(`Fuel Data in Attendance:`, JSON.stringify(att.fuel, null, 2));
            console.log(`Pending Expenses:`, JSON.stringify(att.pendingExpenses, null, 2));
        }

        // 3. Find fuel entries for vehicle or attendance
        const fuelEntries = await Fuel.find({
            $or: [
                { vehicle: vehicle._id },
                { attendance: { $in: attendances.map(a => a._id) } }
            ]
        }).populate('attendance');

        console.log(`--- Fuel Entries in Fuel Collection ---`);
        console.log(`Found ${fuelEntries.length} entries for vehicle/attendance`);
        fuelEntries.forEach(f => {
            console.log(`ID: ${f._id} | Date: ${f.date.toISOString()} | Amount: ${f.amount} | Odo: ${f.odometer} | AttId: ${f.attendance?._id} | Source: ${f.source}`);
        });

        process.exit(0);
    } catch (e) {
        console.error('Error running script:', e);
        process.exit(1);
    }
}

run();
