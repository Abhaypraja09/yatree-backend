const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const optimize = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;

        const tasks = [
            // 1. Attendance Indexes
            { collection: 'attendances', index: { company: 1, date: -1 } },
            { collection: 'attendances', index: { driver: 1, date: -1 } },
            { collection: 'attendances', index: { vehicle: 1, date: -1 } },
            { collection: 'attendances', index: { status: 1 } },

            // 2. Fuel Indexes
            { collection: 'fuels', index: { company: 1, date: -1 } },
            { collection: 'fuels', index: { vehicle: 1, date: -1 } },
            { collection: 'fuels', index: { driver: 1, date: -1 } },

            // 3. Maintenance Indexes
            { collection: 'maintenances', index: { company: 1, date: -1 } },
            { collection: 'maintenances', index: { billDate: -1 } },
            { collection: 'maintenances', index: { vehicle: 1 } },

            // 4. Vehicle Indexes
            { collection: 'vehicles', index: { company: 1, isOutsideCar: 1 } },
            { collection: 'vehicles', index: { carNumber: 1 } },

            // 5. User Indexes
            { collection: 'users', index: { company: 1, role: 1 } },
            { collection: 'users', index: { mobile: 1 } },

            // 6. Parking Indexes
            { collection: 'parkings', index: { company: 1, date: -1 } },
            { collection: 'parkings', index: { vehicle: 1 } },

            // 7. Advance Indexes
            { collection: 'advances', index: { company: 1, date: -1 } },
            { collection: 'advances', index: { driver: 1 } },

            // 8. Border Tax Indexes
            { collection: 'bordertaxes', index: { company: 1, date: -1 } },
            { collection: 'bordertaxes', index: { vehicle: 1 } },

            // 9. Accident Logs
            { collection: 'accidentlogs', index: { company: 1, date: -1 } },

            // 10. Parts Warranty
            { collection: 'partswarranties', index: { company: 1, purchaseDate: -1 } },
        ];

        for (const task of tasks) {
            console.log(`Creating index for ${task.collection}:`, task.index);
            await db.collection(task.collection).createIndex(task.index, { background: true });
        }

        console.log('\n--- Optimization Tasks Completed ---');
        await mongoose.connection.close();
    } catch (error) {
        console.error('Error during optimization:', error);
    }
};

optimize();
