const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const v = await Vehicle.find({ carNumber: /#2026-02-12/ });
        console.log(`Found ${v.length} entries for 2026-02-12`);
        v.forEach(x => {
            console.log(`ID: ${x._id} | CAR: "${x.carNumber}" | CREATED: ${x.createdAt.toISOString()}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

check();
