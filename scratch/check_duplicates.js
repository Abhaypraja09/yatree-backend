const mongoose = require('mongoose');
const User = require('./backend/src/models/User');
require('dotenv').config({ path: './backend/.env' });

async function checkDuplicates() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const drivers = await User.find({ role: 'Driver' });
        const nameCount = {};
        drivers.forEach(d => {
            nameCount[d.name] = (nameCount[d.name] || 0) + 1;
        });

        const duplicates = Object.entries(nameCount).filter(([name, count]) => count > 1);
        console.log('Duplicate Driver Names:', duplicates);

        const suresh = drivers.filter(d => d.name.includes('Suresh Kumar Patel'));
        console.log('Suresh Records:', suresh.map(d => ({ id: d._id, name: d.name, mobile: d.mobile, status: d.status })));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkDuplicates();
