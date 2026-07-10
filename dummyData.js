const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./src/models/User');
const Vehicle = require('./src/models/Vehicle');
const Attendance = require('./src/models/Attendance');

const generateDummyData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB Connected...');

        // Find driver by mobile
        const driver = await User.findOne({ mobile: '12345657885' });
        if (!driver) {
            console.error('Driver with mobile 12345657885 not found');
            process.exit(1);
        }

        // Find vehicle
        const regRegex = new RegExp('RJ.*?27.*?TA.*?0001', 'i');
        let vehicle = await Vehicle.findOne({ registrationNumber: regRegex });
        
        if (!vehicle) {
            console.log('Specific vehicle not found. Falling back to any vehicle in the same company...');
            vehicle = await Vehicle.findOne({ company: driver.company });
            if (!vehicle) {
                console.error('No vehicles found in this company.');
                process.exit(1);
            }
        }
        console.log(`Using vehicle: ${vehicle.registrationNumber}`);

        const companyId = driver.company;

        // Clear existing attendances for this driver in June just to be safe
        await Attendance.deleteMany({
            driver: driver._id,
            date: { $regex: /^2026-06-/ }
        });

        let currentKm = 1;
        const leaveDays = [15, 16, 17];

        for (let day = 1; day <= 30; day++) {
            if (leaveDays.includes(day)) {
                console.log(`Skipping day 2026-06-${day.toString().padStart(2, '0')} (Leave)`);
                continue;
            }

            const dayString = day.toString().padStart(2, '0');
            const dateStr = `2026-06-${dayString}`;
            const punchInTime = new Date(`${dateStr}T09:00:00.000Z`);
            const punchOutTime = new Date(`${dateStr}T18:00:00.000Z`);

            const punchInKm = currentKm;
            const punchOutKm = currentKm + 10;
            currentKm = punchOutKm;

            const att = new Attendance({
                driver: driver._id,
                vehicle: vehicle._id,
                company: companyId,
                date: dateStr,
                status: 'completed',
                punchIn: {
                    time: punchInTime,
                    km: punchInKm,
                    readingImage: ''
                },
                punchOut: {
                    time: punchOutTime,
                    km: punchOutKm,
                    readingImage: '',
                    nightStayAmount: 0,
                    allowanceTA: 0,
                    specialPay: 0,
                    remarks: 'Dummy data'
                },
                dailyWage: driver.dailyWage || 0,
                totalKM: punchOutKm - punchInKm,
                startLocation: { type: 'Point', coordinates: [73.0, 26.0] },
                endLocation: { type: 'Point', coordinates: [73.0, 26.0] }
            });

            await att.save();
            console.log(`Created attendance for ${dateStr}: ${punchInKm} km to ${punchOutKm} km`);
        }

        console.log('Successfully inserted dummy data!');
        process.exit(0);
    } catch (error) {
        console.error('Error inserting dummy data:', error);
        process.exit(1);
    }
};

generateDummyData();
