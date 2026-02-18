const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { DateTime } = require('luxon');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Advance = require('./src/models/Advance');
const Attendance = require('./src/models/Attendance');
const User = require('./src/models/User');

async function verify() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const companyId = '66f7f6e9749195392bc3081e'; // Default company from logs
        const targetDate = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
        const baseDate = DateTime.now().setZone('Asia/Kolkata').startOf('day');

        console.log('Target Date:', targetDate);
        console.log('Company ID:', companyId);

        // 1. Check Attendance
        const attendance = await Attendance.find({
            date: targetDate
        }).populate('driver', 'name status isFreelancer salary dailyWage');

        console.log(`\nAttendance found for today: ${attendance.length}`);
        attendance.forEach(a => {
            console.log(`- Driver: ${a.driver?.name} (${a.driver?.isFreelancer ? 'Freelancer' : 'Staff'}), Salary: ${a.driver?.salary}, DailyWage: ${a.driver?.dailyWage}, Att.DailyWage: ${a.dailyWage}`);
        });

        // 2. Check Advances today
        const start = baseDate.toJSDate();
        const end = baseDate.endOf('day').toJSDate();

        const advances = await Advance.find({
            date: { $gte: start, $lte: end }
        }).populate('driver', 'name');

        console.log(`\nAdvances found for today: ${advances.length}`);
        advances.forEach(adv => {
            console.log(`- Amount: ${adv.amount}, Driver: ${adv.driver?.name}, Date: ${adv.date}`);
        });

        // 3. Aggregate test
        const dailyAdvanceData = await Advance.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        console.log('\nAggregation Result:', dailyAdvanceData);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

verify();
