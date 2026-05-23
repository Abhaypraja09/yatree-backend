const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const { DateTime } = require('luxon');

// Mock req and res for testing
async function runComparison(driverId, month, year) {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const User = require('../backend/src/models/User');
        const Attendance = require('../backend/src/models/Attendance');
        const Advance = require('../backend/src/models/Advance');
        const Parking = require('../backend/src/models/Parking');
        const Loan = require('../backend/src/models/Loan');
        const Allowance = require('../backend/src/models/Allowance');

        console.log(`\n--- COMPARING RESULTS FOR DRIVER ${driverId} (${month}/${year}) ---\n`);

        // 1. Run Admin Logic (Simplified)
        const startDT = DateTime.fromObject({ year: parseInt(year), month: parseInt(month), day: 1 }, { zone: 'Asia/Kolkata' }).startOf('month');
        const endDT = startDT.endOf('month');
        const startStr = startDT.toFormat('yyyy-MM-dd');
        const endStr = endDT.toFormat('yyyy-MM-dd');
        const startJS = startDT.toJSDate();
        const endJS = endDT.toJSDate();

        const attAdmin = await Attendance.find({ driver: driverId, status: { $in: ['completed', 'incomplete'] }, date: { $gte: startStr, $lte: endStr } });
        const driver = await User.findById(driverId);
        const advAdmin = await Advance.find({ driver: driverId, date: { $gte: startJS, $lte: endJS }, remark: { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ } });
        const allowancesAdmin = await Allowance.find({ driver: driverId, date: { $gte: startJS, $lte: endJS } });

        let wagesAdmin = attAdmin.reduce((sum, a) => sum + (Number(a.dailyWage) || 0), 0);
        let bonusesAdmin = attAdmin.reduce((sum, a) => {
             const sdr = Number(a.punchOut?.allowanceTA) || 0;
             const night = Number(a.punchOut?.nightStayAmount) || 0;
             const special = Number(a.punchOut?.specialPay) || 0;
             const other = Math.max(0, (Number(a.outsideTrip?.bonusAmount) || 0) - sdr - night);
             return sum + sdr + night + special + other;
        }, 0);

        console.log(`Admin Calculation:`);
        console.log(`  Wages: ${wagesAdmin}`);
        console.log(`  Bonuses: ${bonusesAdmin}`);
        console.log(`  Allowances: ${allowancesAdmin.reduce((s,a) => s + a.amount, 0)}`);
        console.log(`  Advances: ${advAdmin.reduce((s,a) => s + a.amount, 0)}`);

        // 2. Run Driver Logic (Simplified)
        const attDriver = await Attendance.find({ driver: driverId, status: 'completed', date: { $gte: startStr, $lte: endStr } });
        let wagesDriver = attDriver.reduce((sum, a) => sum + (Number(a.dailyWage) || 0), 0);
        
        console.log(`\nDriver App Calculation:`);
        console.log(`  Wages: ${wagesDriver}`);
        console.log(`  Found ${attDriver.length} completed shifts.`);
        console.log(`  (Note: Admin found ${attAdmin.length} completed/incomplete shifts)`);

        if (attAdmin.length !== attDriver.length) {
            console.log(`\n[!!!] DISCREPANCY DETECTED: Admin includes 'incomplete' shifts, Driver App only includes 'completed'.`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

// Find a driver and test
runComparison('6993463109a83283ae7365ae', 4, 2026);
