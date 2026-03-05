const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User');

async function checkDrivers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const freelancers = await User.find({ role: 'Driver', isFreelancer: true });
        console.log(`Found ${freelancers.length} Freelancers:`);
        freelancers.forEach(f => {
            console.log(`Name: ${f.name}, Status: ${f.status}, TripStatus: ${f.tripStatus}, ID: ${f._id}`);
        });

        const permanent = await User.find({ role: 'Driver', isFreelancer: false });
        console.log(`Found ${permanent.length} Permanent Drivers:`);
        permanent.forEach(p => {
            console.log(`Name: ${p.name}, Status: ${p.status}, TripStatus: ${p.tripStatus}, ID: ${p._id}`);
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkDrivers();
