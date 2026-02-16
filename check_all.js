const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const count = await Vehicle.countDocuments();
        const all = await Vehicle.find().limit(10).sort({ createdAt: -1 });
        let out = `Total Vehicles: ${count}\n`;
        all.forEach(x => {
            out += `ID: ${x._id} | CAR: "${x.carNumber}" | CREATED: ${x.createdAt.toISOString()}\n`;
        });
        fs.writeFileSync('all_vehicles_out.txt', out);
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
};

check();
