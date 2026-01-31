const cron = require('node-cron');
const Vehicle = require('../models/Vehicle');
const fs = require('fs');
const path = require('path');

const logCron = (msg) => {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] CRON: ${msg}\n`;
    try {
        fs.appendFileSync(path.join(process.cwd(), 'server_debug.log'), logMsg);
    } catch (e) {
        console.error('Failed to write to cron log', e);
    }
};

const initCronJobs = () => {
    // Monthly Fastag Balance Reset (1st of month at 00:00)
    cron.schedule('0 0 1 * *', async () => {
        logCron('Starting Monthly Fastag Balance Reset (1st of month)');
        try {
            const result = await Vehicle.updateMany({}, { $set: { fastagBalance: 0 } });
            logCron(`Successfully reset Fastag balance for ${result.modifiedCount} vehicles.`);
        } catch (error) {
            logCron(`ERROR resetting Fastag balance: ${error.message}`);
        }
    });

    // Daily Document Expiry Check (Every day at 10:00 AM)
    cron.schedule('0 10 * * *', async () => {
        const { DateTime } = require('luxon');
        const { sendSMS } = require('./smsService');
        const User = require('../models/User');

        logCron('Starting Daily Document Expiry Check (30, 7, 1 days advance)');
        try {
            const admin = await User.findOne({ role: 'Admin' });
            if (!admin || !admin.mobile) {
                logCron('ABORT: No admin mobile found.');
                return;
            }

            const now = DateTime.now().setZone('Asia/Kolkata').startOf('day');

            // Look for any vehicles that have documents expiring
            const vehicles = await Vehicle.find({
                'documents.expiryDate': { $exists: true }
            });

            for (const vehicle of vehicles) {
                for (const doc of vehicle.documents) {
                    const expiry = DateTime.fromJSDate(doc.expiryDate).setZone('Asia/Kolkata').startOf('day');
                    const daysLeft = Math.ceil(expiry.diff(now, 'days').days);

                    // Send alerts at specific intervals
                    if (daysLeft === 30 || daysLeft === 7 || daysLeft === 1) {
                        const message = `REMAINDER: Vehicle document for ${vehicle.carNumber} (${doc.documentType}) is expiring in ${daysLeft} day(s) on ${expiry.toFormat('dd-MM-yyyy')}. Please renew it ASAP. [FleetCRM]`;

                        // User requested to remove SMS notifications to save costs
                        // await sendSMS(admin.mobile, message); 

                        logCron(`[NOTIFICATION SUPPRESSED] Expiry alert for ${vehicle.carNumber} - ${doc.documentType} (${daysLeft} days left). SMS disabled at user request.`);
                    }
                }
            }

            logCron(`Daily document expiry check completed.`);
        } catch (error) {
            logCron(`ERROR in Document Expiry Check: ${error.message}`);
        }
    });

    logCron('Cron Jobs Initialized');
};

module.exports = initCronJobs;
