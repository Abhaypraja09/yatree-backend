const mongoose = require('mongoose');
const User = require('./src/models/User');
const Attendance = require('./src/models/Attendance');
const Parking = require('./src/models/Parking');
const { DateTime } = require('luxon');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const driverId = '69915f7538b3cc58c9461524'; // Shailendra

    const month = 2;
    const year = 2026;

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const startStr = DateTime.fromJSDate(startOfMonth).toFormat('yyyy-MM-dd');
    const endStr = DateTime.fromJSDate(endOfMonth).toFormat('yyyy-MM-dd');

    const attendance = await Attendance.find({
        driver: driverId,
        status: 'completed',
        date: { $gte: startStr, $lte: endStr }
    }).sort({ date: 1 });

    const driver = await User.findById(driverId);

    const parking = await Parking.find({
        $or: [
            { driverId: driverId },
            { driver: { $regex: new RegExp(`^${driver.name.trim()}$`, 'i') } }
        ],
        date: { $gte: startOfMonth, $lte: endOfMonth },
        serviceType: { $ne: 'car_service' }
    }).sort({ date: 1 });

    const externalByDay = new Map();
    parking.forEach(p => {
        const dStr = DateTime.fromJSDate(p.date).setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
        externalByDay.set(dStr, (externalByDay.get(dStr) || 0) + (Number(p.amount) || 0));
    });

    const surplusUsed = new Set();
    const dailyBreakdown = attendance.map(att => {
        const wage = Number(att.dailyWage) || Number(driver.dailyWage) || 500;
        const sameDayReturn = Number(att.punchOut?.allowanceTA) || 0;
        const nightStay = Number(att.punchOut?.nightStayAmount) || 0;
        const otherBonuses = Number(att.outsideTrip?.bonusAmount) || 0;
        const bonuses = sameDayReturn + nightStay + otherBonuses;

        const totalExternalForDay = externalByDay.get(att.date) || 0;

        let finalParkingCell = 0;
        if (!surplusUsed.has(att.date)) {
            finalParkingCell = totalExternalForDay;
            surplusUsed.add(att.date);
        }
        const isManualEntry = att.punchOut?.remarks === 'Manual Entry';

        return {
            date: att.date,
            type: isManualEntry ? 'Manual Entry' : 'Duty',
            wage,
            sameDayReturn,
            nightStay,
            otherBonuses,
            bonuses,
            parking: finalParkingCell,
            total: wage + bonuses + finalParkingCell,
            remarks: isManualEntry ? '' : (att.punchOut?.remarks || '')
        };
    });

    console.log("Daily Breakdown:");
    dailyBreakdown.forEach(d => console.log(`${d.date}: Wage ${d.wage}, Parking: ${d.parking}, Total: ${d.total}`));

    const attendanceDates = new Set(attendance.map(a => a.date));
    const standaloneParkingEntries = parking.filter(p => {
        const d = DateTime.fromJSDate(p.date).setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
        return !attendanceDates.has(d);
    });

    console.log("\nStandalone Parking:");
    standaloneParkingEntries.forEach(p => console.log(`${p.date.toISOString()}: ${p.amount}`));

    process.exit();
}

check();
