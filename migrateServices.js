const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Parking = require('./src/models/Parking');
const Maintenance = require('./src/models/Maintenance');

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const legacyServices = await Parking.find({ serviceType: 'car_service' });
        console.log(`Found ${legacyServices.length} legacy car services in Parking collection.`);

        let migratedCount = 0;
        for (const p of legacyServices) {
            // Check if already migrated
            const existing = await Maintenance.findOne({ description: p.remark, billDate: p.date, amount: p.amount });
            if (!existing) {
                let category = 'Other Service';
                if (p.remark && p.remark.toLowerCase().includes('wash')) category = 'Car Wash';
                else if (p.remark && p.remark.toLowerCase().includes('puncture')) category = 'Puncture repair';

                await Maintenance.create({
                    vehicle: p.vehicle,
                    company: p.company,
                    driver: p.driverId,
                    maintenanceType: 'Car Service',
                    category: category,
                    description: p.remark,
                    garageName: p.location || 'Self',
                    billNumber: p.source === 'Driver' ? 'App Entry' : 'Legacy Admin Entry',
                    billDate: p.date,
                    amount: p.amount,
                    paymentMode: 'Cash',
                    billPhoto: p.receiptPhoto,
                    status: 'Completed'
                });
                migratedCount++;
            }
        }

        console.log(`Successfully migrated ${migratedCount} new records.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrate();
