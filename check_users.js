const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./src/models/User');

dotenv.config({ path: path.join(__dirname, '.env') });

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const users = await User.find({ role: 'Staff' }).select('name mobile username password role status');
        console.log('--- STAFF USERS ---');
        users.forEach(u => {
            console.log(`Name: ${u.name}, Mobile: ${u.mobile}, Username: ${u.username}, HasPassword: ${!!u.password}, Status: ${u.status}`);
        });

        const admins = await User.find({ role: 'Admin' }).select('name mobile username role');
        console.log('--- ADMIN USERS ---');
        admins.forEach(u => {
            console.log(`Name: ${u.name}, Mobile: ${u.mobile}, Role: ${u.role}`);
        });

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

checkUsers();
