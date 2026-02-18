const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Attendance = require('./src/models/Attendance');
const User = require('./src/models/User');

dotenv.config();

const verify = async () => {
    try {
        const uri = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const monthStart = '2026-02-01';
        const monthEnd = '2026-02-28';
        const targetDate = '2026-02-18';

        const attToday = await Attendance.find({ date: targetDate }).populate('driver');
        console.log(`Attendance today (${targetDate}): ${attToday.length}`);
        attToday.forEach(a => {
            console.log(`- Driver: ${a.driver?.name}, Wage: ${a.dailyWage}, DriverWage: ${a.driver?.dailyWage}, DriverSalary: ${a.driver?.salary}`);
        });

        const attMonth = await Attendance.find({
            date: { $gte: monthStart, $lte: monthEnd }
        }).populate('driver');
        console.log(`Attendance this month (${monthStart} to ${monthEnd}): ${attMonth.length}`);

        const monthlyWorkedDrivers = new Map();
        attMonth.forEach(att => {
            if (att.driver) {
                const key = `${att.driver._id}_${att.date}`;
                if (!monthlyWorkedDrivers.has(key)) {
                    const wage = (Number(att.dailyWage) || 0) ||
                        (Number(att.driver.dailyWage) || 0) ||
                        (Number(att.driver.salary) || 0) || 500;
                    monthlyWorkedDrivers.set(key, wage);
                }
            }
        });
        const monthlyTotal = Array.from(monthlyWorkedDrivers.values()).reduce((sum, val) => sum + val, 0);
        console.log(`Calculated Monthly Total: ${monthlyTotal}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

verify();
