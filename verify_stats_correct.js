const mongoose = require('mongoose');
const { DateTime } = require('luxon');

async function verify() {
    const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";
    try {
        await mongoose.connect(latestAtlasURI);
        const Advance = mongoose.model('Advance', new mongoose.Schema({}, { strict: false }));
        const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));

        const companyId = '6982e8b7d0b069a49db197b9';
        const targetDate = "2026-02-17";
        const baseDate = DateTime.fromISO(targetDate + "T00:00:00", { zone: 'Asia/Kolkata' });

        console.log('--- RECAP FOR:', targetDate, '---');

        // 1. Daily Advances
        const dailyAdvanceData = await Advance.aggregate([
            {
                $match: {
                    company: new mongoose.Types.ObjectId(companyId),
                    date: {
                        $gte: baseDate.toJSDate(),
                        $lte: baseDate.endOf('day').toJSDate()
                    }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        console.log('DAILY ADVANCES SUM:', dailyAdvanceData[0]?.total || 0);

        // 2. Daily Salary
        const attendanceToday = await Attendance.find({
            company: new mongoose.Types.ObjectId(companyId),
            date: targetDate
        }).populate({
            path: 'driver',
            model: 'User'
        });

        const workedDriversMap = new Map();
        attendanceToday.forEach(att => {
            if (att.driver) {
                const driverId = att.driver._id.toString();
                if (!workedDriversMap.has(driverId)) {
                    // Check attendance dailyWage first, then driver defaults
                    const salarySum = (att.dailyWage) ||
                        (att.driver.isFreelancer ? (att.driver.dailyWage || 0) : (att.driver.salary || 0));
                    workedDriversMap.set(driverId, salarySum);
                }
            }
        });

        const outsideCarsToday = await Vehicle.find({
            company: new mongoose.Types.ObjectId(companyId),
            isOutsideCar: true,
            carNumber: { $regex: `#${targetDate}(#|$)` }
        });

        const dailySalaryFromAttendance = Array.from(workedDriversMap.values()).reduce((sum, val) => sum + Number(val || 0), 0);
        const dailySalaryFromOutsideCars = outsideCarsToday.reduce((sum, v) => sum + Number(v.dutyAmount || 0), 0);
        const dailySalaryTotal = dailySalaryFromAttendance + dailySalaryFromOutsideCars;

        console.log('DAILY SALARY COST:', dailySalaryTotal);
        console.log('- From Attendance:', dailySalaryFromAttendance, `(${workedDriversMap.size} drivers)`);
        console.log('- From Outside Cars:', dailySalaryFromOutsideCars, `(${outsideCarsToday.length} cars)`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
verify();
