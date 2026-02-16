const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');
const Company = require('./src/models/Company');

const testCreate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const company = await Company.findOne();
        if (!company) throw new Error('No company');

        console.log('Using company:', company._id);

        const carNumber = `TEST-${Math.random().toString(36).substring(7)}#2026-02-12#abcde`;

        const vehicle = await Vehicle.create({
            carNumber,
            model: 'Test Model',
            permitType: 'All India Permit',
            company: company._id,
            isOutsideCar: true,
            driverName: 'Test Driver',
            ownerName: 'Test Owner',
            dutyAmount: 1000,
            dutyType: 'Local',
            createdAt: new Date('2026-02-12')
        });

        console.log('Created:', vehicle._id);
        process.exit(0);
    } catch (err) {
        console.error('FAILED TO CREATE:', err);
        process.exit(1);
    }
};

testCreate();
