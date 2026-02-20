const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const Advance = mongoose.model('Advance', new mongoose.Schema({}, { strict: false }));
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const company = await mongoose.connection.db.collection('companies').findOne({ name: /Yatree/i });
        const companyId = company._id;
        const month = 2;
        const year = 2026;

        // Simulate getDriverSalarySummary
        const drivers = await User.find({
            company: companyId,
            role: 'Driver',
            isFreelancer: { $ne: true }
        }).select('name mobile dailyWage');

        console.log(`Processing ${drivers.length} drivers...`);

        const summaries = [];
        for (let driver of drivers) {
            let attendanceQuery = {
                driver: driver._id,
                status: 'completed',
                date: { $gte: "2026-02-01", $lte: "2026-02-28" }
            };
            let advanceQuery = { driver: driver._id };

            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
            advanceQuery.date = { $gte: startOfMonth, $lte: endOfMonth };
            // Original code didn't have the regex filter until I added it today.
            // Let's see what it finds WITHOUT the filter.

            const attendance = await Attendance.find(attendanceQuery);
            const advances = await Advance.find(advanceQuery);

            const totalEarned = attendance.reduce((sum, att) => {
                const wage = att.dailyWage || driver.dailyWage || 500;
                const bonuses = (att.punchOut?.allowanceTA || 0) + (att.punchOut?.nightStayAmount || 0);
                return sum + wage + bonuses;
            }, 0);

            const totalAdvances = advances.reduce((sum, adv) => sum + (adv.amount || 0), 0);
            const totalRecovered = advances.reduce((sum, adv) => sum + (adv.recoveredAmount || 0), 0);
            const pendingAdvance = totalAdvances - totalRecovered;

            summaries.push({
                name: driver.name,
                totalEarned,
                totalAdvances,
                pendingAdvance,
                advCount: advances.length
            });
        }

        const abhay = summaries.find(s => s.name.includes('Abhay'));
        console.log('Abhay Summary:', JSON.stringify(abhay, null, 2));

        console.log('--- ALL SUMMARIES ---');
        summaries.forEach(s => {
            if (s.totalEarned > 0 || s.totalAdvances > 0) {
                console.log(`${s.name}: Earned=${s.totalEarned}, Adv=${s.totalAdvances} (pending=${s.pendingAdvance}), Count=${s.advCount}`);
            }
        });

        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

run();
