const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const User = require('./src/models/User');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    const admin = await User.findOne({ role: 'Admin' });
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const companyId = admin.company;

    const axios = require('axios');
    try {
        const res = await axios.get(`http://localhost:5005/api/admin/vehicle-monthly-details/${companyId}?month=2&year=2026`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Success:', res.data.length, 'vehicles found');
        if (res.data.length > 0) {
            console.log('Sample Vehicle:', res.data[0].carNumber);
            console.log('Drivers:', res.data[0].drivers);
        }
    } catch (err) {
        console.error('Error:', err.response?.data || err.message);
    }
    process.exit();
}
test();
