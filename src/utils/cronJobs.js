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
    // Monthly Fastag Balance Reset (1st of month at 00:00 IST)
    cron.schedule('0 0 1 * *', async () => {
        logCron('Starting Monthly Fastag Balance Reset (1st of month)');
        try {
            const result = await Vehicle.updateMany({}, {
                $set: {
                    fastagBalance: 0,
                    fastagHistory: [] // Also clearing history at start of month if they want a clean slate
                }
            });
            logCron(`Successfully reset Fastag balance and history for ${result.modifiedCount} vehicles.`);
        } catch (error) {
            logCron(`ERROR resetting Fastag balance: ${error.message}`);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
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

    // Daily Warranty Expiry Check (Every day at 10:30 AM)
    cron.schedule('30 10 * * *', async () => {
        const { DateTime } = require('luxon');
        const PartsWarranty = require('../models/PartsWarranty');
        const User = require('../models/User');

        logCron('Starting Daily Warranty Expiry Check');
        try {
            // 1. Auto-expire warranties that have passed their end date
            const updateResult = await PartsWarranty.updateMany(
                { status: 'Active', warrantyEndDate: { $lt: new Date() } },
                { $set: { status: 'Expired' } }
            );
            if (updateResult.modifiedCount > 0) {
                logCron(`Updated ${updateResult.modifiedCount} warranties to EXPIRED status.`);
            }

            const now = DateTime.now().setZone('Asia/Kolkata').startOf('day');

            // 2. Alert for warranties expiring in exactly 7 days
            const targetDate = now.plus({ days: 7 }).toJSDate();
            const tomorrow = now.plus({ days: 8 }).toJSDate();

            const expiringWarranties = await PartsWarranty.find({
                status: 'Active',
                warrantyEndDate: { $gte: targetDate, $lt: tomorrow }
            }).populate('vehicle', 'carNumber');

            for (const warranty of expiringWarranties) {
                const message = `WARRANTY ALERT: ${warranty.partName} for ${warranty.vehicle?.carNumber} is expiring in 7 days on ${DateTime.fromJSDate(warranty.warrantyEndDate).toFormat('dd-MM-yyyy')}. Purchase: ${warranty.supplierName}. [FleetCRM]`;
                logCron(`[WARRANTY ALERT] ${message}`);
            }

            logCron(`Daily warranty expiry check completed. Found ${expiringWarranties.length} alerts.`);
        } catch (error) {
            logCron(`ERROR in Warranty Expiry Check: ${error.message}`);
        }
    });

    logCron('Cron Jobs Initialized');
};

module.exports = initCronJobs;
