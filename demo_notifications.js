const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');
const User = require('./src/models/User');
const { DateTime } = require('luxon');
const { sendSMS } = require('./src/utils/smsService');
require('dotenv').config();

async function demoTrigger() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('--- FORCED NOTIFICATION DEMO ---');

        const admin = await User.findOne({ role: 'Admin' });
        const mobile = admin ? admin.mobile : '9660953135';

        // Find ANY document that is expiring within 30 days
        const vs = await Vehicle.find();
        let found = false;

        const now = DateTime.now().setZone('Asia/Kolkata').startOf('day');

        for (const v of vs) {
            for (const d of v.documents) {
                const expiry = DateTime.fromJSDate(d.expiryDate).setZone('Asia/Kolkata').startOf('day');
                const daysLeft = Math.ceil(expiry.diff(now, 'days').days);

                if (daysLeft <= 30 && daysLeft >= 0) {
                    found = true;
                    console.log(`MATCH FOUND: ${v.carNumber} - ${d.documentType} (Expires in ${daysLeft} days)`);
                    const message = `[DEMO ALERT] Vehicle document for ${v.carNumber} (${d.documentType}) is expiring on ${expiry.toFormat('dd-MM-yyyy')}. Only ${daysLeft} days left!`;
                    await sendSMS(mobile, message);
                }
            }
        }

        if (!found) {
            console.log('No documents found expiring within the next 30 days.');
        }

        console.log('\n--- DEMO COMPLETED ---');
        console.log('Note: These messages only appear here in the console/logs.');
        console.log('To get them on your phone, you need to connect an SMS Gateway API.');

        process.exit(0);
    } catch (error) {
        console.error('Demo failed:', error);
        process.exit(1);
    }
}

demoTrigger();
