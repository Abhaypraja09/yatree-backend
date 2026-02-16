const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const vehicles = await Vehicle.find({ isOutsideCar: true }).sort({ createdAt: -1 }).limit(20);
        console.log(`Checking last 20 outside car entries:`);

        vehicles.forEach(v => {
            const carNumberDate = v.carNumber?.split('#')[1];
            const createdAtDate = v.createdAt.toISOString().split('T')[0];
            const mismatch = carNumberDate !== createdAtDate ? 'MISMATCH!' : '';
            console.log(`ID: ${v._id} | Plate: "${v.carNumber?.split('#')[0]}" | carNumberDate: ${carNumberDate} | createdAt: ${createdAtDate} ${mismatch}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

check();
