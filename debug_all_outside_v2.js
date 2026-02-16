const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const vehicles = await Vehicle.find({ isOutsideCar: true });
        let out = `Found ${vehicles.length} outside cars\n`;

        vehicles.forEach(v => {
            out += `ID: ${v._id} | CAR: "${v.carNumber}" | DATE: ${v.createdAt.toISOString()}\n`;
        });

        fs.writeFileSync('outside_cars_data.txt', out);
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('outside_cars_error.txt', err.stack);
        process.exit(1);
    }
};

check();
