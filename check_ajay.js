const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ username: 'Ajay1234' });
    if (user) {
        console.log('PERMISSIONS_START');
        console.log(JSON.stringify(user.permissions, null, 2));
        console.log('PERMISSIONS_END');
        console.log('COMPANY:', user.company);
    } else {
        console.log('USER NOT FOUND');
    }
    await mongoose.disconnect();
}
check();
