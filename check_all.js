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
    console.log('--- DB CHECK ---');

    const date = '2026-03-28';
    const fuels = await Fuel.find({ date: { 
        $gte: new Date(date + 'T00:00:00Z'), 
        $lte: new Date(date + 'T23:59:59Z') 
    } }).populate('vehicle', 'carNumber');

    console.log('Fuels on', date);
    fuels.forEach(f => console.log(`ID: ${f._id}, Vehicle: ${f.vehicle?.carNumber}, Driver: ${f.driver}, Amount: ${f.amount}, Attendance: ${f.attendance}`));

    const attendances = await Attendance.find({ date: date }).populate('driver', 'name').populate('vehicle', 'carNumber');
    console.log('\nAttendances on', date);
    attendances.forEach(a => console.log(`ID: ${a._id}, Vehicle: ${a.vehicle?.carNumber}, Driver: ${a.driver?.name}, AttFuel: ${a.fuel?.amount}, Status: ${a.status}`));

    mongoose.disconnect();
}

check();
