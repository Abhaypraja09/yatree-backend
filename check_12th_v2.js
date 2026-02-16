const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const v = await Vehicle.find({ carNumber: /#2026-02-12/ });
        let out = `Found ${v.length} entries for 2026-02-12\n`;
        v.forEach(x => {
            out += `ID: ${x._id} | CAR: "${x.carNumber}" | CREATED: ${x.createdAt.toISOString()}\n`;
        });
        fs.writeFileSync('check_12th_out.txt', out);
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
};

check();
