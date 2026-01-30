const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');
const User = require('./src/models/User');
const { DateTime } = require('luxon');
const { sendSMS } = require('./src/utils/smsService');
require('dotenv').config();

async function triggerNow() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('--- MANUAL NOTIFICATION TRIGGER ---');

        const admin = await User.findOne({ role: 'Admin' });
        console.log(`Admin Number: ${admin ? admin.mobile : 'NOT FOUND'}`);

        const targetDate = DateTime.now().setZone('Asia/Kolkata').plus({ days: 30 }).startOf('day');
        console.log(`Checking for expiry date: ${targetDate.toFormat('dd-MM-yyyy')}`);

        const vehicles = await Vehicle.find({
            'documents.expiryDate': {
                $gte: targetDate.toJSDate(),
                $lte: targetDate.endOf('day').toJSDate()
            }
        });

        console.log(`Found ${vehicles.length} vehicles with documents expiring on this date.`);

        if (vehicles.length > 0) {
            for (const vehicle of vehicles) {
                const expiringDocs = vehicle.documents.filter(doc => {
                    const expiry = DateTime.fromJSDate(doc.expiryDate).setZone('Asia/Kolkata').startOf('day');
                    return expiry.toISODate() === targetDate.toISODate();
                });

                for (const doc of expiringDocs) {
                    const message = `ALERT: Vehicle document for ${vehicle.carNumber} (${doc.documentType}) is expiring on ${targetDate.toFormat('dd-MM-yyyy')}. Please renew it within 30 days.`;
                    await sendSMS(admin ? admin.mobile : '9660953135', message);
                }
            }
            console.log('All matching notifications processed.');
        } else {
            console.log('\nNO MATCH FOUND! To see a message, please ensure a car in the admin panel has a document (RC/Permit/etc.) with an expiry date set exactly to: ' + targetDate.toFormat('dd-MM-yyyy'));
        }

        process.exit(0);
    } catch (error) {
        console.error('Trigger failed:', error);
        process.exit(1);
    }
}

triggerNow();
