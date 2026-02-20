const mongoose = require('mongoose');
const Attendance = require('./src/models/Attendance');
const Parking = require('./src/models/Parking');
const Vehicle = require('./src/models/Vehicle');
const User = require('./src/models/User');
const fs = require('fs');

const MONGO_URI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function debugSalary() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const vehicle = await Vehicle.findOne({ carNumber: 'RJ-27-TB-1370' });
        if (!vehicle) {
            console.log('Vehicle RJ-27-TB-1370 not found');
            return;
        }
        console.log(`Found Vehicle: ${vehicle.carNumber} (${vehicle._id})`);

        // Check Attendance for Feb 10-18
        const startDate = new Date('2026-02-01');
        const endDate = new Date('2026-02-28');

        // Fetch ALL attendance in Feb to be sure
        const attendance = await Attendance.find({
            vehicle: vehicle._id,
            date: { $gte: '2026-02-01', $lte: '2026-02-28' }
        }).populate('driver', 'name mobile').sort({ date: 1 });

        const results = {
            attendance: attendance.map(att => ({
                id: att._id,
                date: att.date,
                driver: att.driver?.name,
                wage: att.dailyWage,
                bonuses: (att.punchOut?.allowanceTA || 0) + (att.punchOut?.nightStayAmount || 0),
                tollParkingPunchOut: att.punchOut?.tollParkingAmount,
                parkingArray: att.parking,
                pendingExpenses: att.pendingExpenses
            })),
            parkingEntries: []
        };

        // Check Parking Collection
        const driverIds = [...new Set(attendance.map(a => a.driver?._id))];

        for (const driverId of driverIds) {
            if (!driverId) continue;
            const parking = await Parking.find({
                driver: driverId,
                date: { $gte: startDate, $lte: endDate }
            });
            results.parkingEntries.push({ driverId, parking });
        }

        fs.writeFileSync('debug_results.json', JSON.stringify(results, null, 2));
        console.log('Results written to debug_results.json');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

debugSalary();
