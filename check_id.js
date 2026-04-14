const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: 'c:/Users/ABHAY/OneDrive/Desktop/TEXI/taxi-fleet-crm/backend/.env' });

const idToCheck = '69bbed793554dd888c5728dd';

async function checkId() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}));
        const Attendance = mongoose.model('Attendance', new mongoose.Schema({}));
        const Event = mongoose.model('Event', new mongoose.Schema({}));

        const v = await Vehicle.findById(idToCheck);
        console.log('Vehicle found:', !!v);

        const a = await Attendance.findById(idToCheck);
        console.log('Attendance found:', !!a);

        const e = await Event.findById(idToCheck);
        console.log('Event found:', !!e);

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

checkId();
