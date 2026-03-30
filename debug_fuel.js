const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const Attendance = require('./src/models/Attendance');
const Fuel = require('./src/models/Fuel');
const Vehicle = require('./src/models/Vehicle');
const User = require('./src/models/User');

const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";
const MONGODB_URI = (process.env.MONGODB_URI || latestAtlasURI).trim();

async function check() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected');

    const date = '2026-03-28';
    const carNumber = 'RJ-27-TB-7020';

    const vehicle = await Vehicle.findOne({ carNumber: { $regex: carNumber } });
    if (!vehicle) {
        console.log('Vehicle not found');
        return;
    }

    const fuels = await Fuel.find({ vehicle: vehicle._id, date: { 
        $gte: new Date(date + 'T00:00:00Z'), 
        $lte: new Date(date + 'T23:59:59Z') 
    } });
    console.log('--- FUELS ---');
    console.log(JSON.stringify(fuels.map(f => ({ id: f._id, amount: f.amount, driver: f.driver, attendance: f.attendance })), null, 2));

    const attendances = await Attendance.find({ vehicle: vehicle._id, date: date }).populate('driver', 'name');
    console.log('--- ATTENDANCES ---');
    console.log(JSON.stringify(attendances.map(a => ({ 
        id: a._id, 
        driver: a.driver?.name, 
        fuelStatus: a.status,
        fuelAmountInAtt: a.fuel?.amount, 
        fuelEntriesInAtt: a.fuel?.entries 
    })), null, 2));

    mongoose.disconnect();
}

check();
