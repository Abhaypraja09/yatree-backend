const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User');

async function checkAmritUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const amrit = await User.findOne({ name: 'Amrit' });
        if (amrit) {
            console.log('Amrit User details:');
            console.log(JSON.stringify(amrit, null, 2));
        } else {
            console.log('Amrit not found');
            const allUsers = await User.find({ name: /Amrit/i });
            console.log('Similar users:', allUsers.map(u => ({ name: u.name, id: u._id, status: u.status, tripStatus: u.tripStatus })));
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkAmritUser();
