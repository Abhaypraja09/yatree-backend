const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Models
const Attendance = require('./src/models/Attendance');
const Fuel = require('./src/models/Fuel');

dotenv.config({ path: path.join(__dirname, '.env') });

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected for Migration');

        // 1. Update Attendance pendingExpenses
        console.log('Migrating Attendance pendingExpenses...');
        const atts = await Attendance.find({
            'pendingExpenses.paymentSource': 'Yatree Office'
        });
        
        console.log(`Found ${atts.length} attendance records to update.`);
        
        let attCount = 0;
        for (const att of atts) {
            att.pendingExpenses.forEach(exp => {
                if (exp.paymentSource === 'Yatree Office') {
                    exp.paymentSource = 'Office';
                }
            });
            // Also check nested fuel entries if any
            if (att.fuel && att.fuel.entries) {
                att.fuel.entries.forEach(entry => {
                    if (entry.paymentSource === 'Yatree Office') {
                        entry.paymentSource = 'Office';
                    }
                });
            }
            await att.save();
            attCount++;
        }
        console.log(`Successfully updated ${attCount} attendance records.`);

        // 2. Update Fuel entries (if any use Yatree Office)
        console.log('Migrating Fuel paymentSource...');
        const fuels = await Fuel.find({
            $or: [
                { paymentSource: 'Yatree Office' },
                { paymentMode: 'Yatree Office' }
            ]
        });
        
        console.log(`Found ${fuels.length} fuel records to update.`);
        
        let fuelCount = 0;
        for (const fuel of fuels) {
            if (fuel.paymentSource === 'Yatree Office') fuel.paymentSource = 'Office';
            if (fuel.paymentMode === 'Yatree Office') fuel.paymentMode = 'Office';
            await fuel.save();
            fuelCount++;
        }
        console.log(`Successfully updated ${fuelCount} fuel records.`);

        console.log('Migration COMPLETED.');
        process.exit(0);
    } catch (error) {
        console.error('Migration FAILED:', error);
        process.exit(1);
    }
};

migrate();
