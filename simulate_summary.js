const mongoose = require('mongoose');
const { DateTime } = require('luxon');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const Advance = mongoose.model('Advance', new mongoose.Schema({}, { strict: false }));
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const companyId = "679f29910d6ffdb21d015946"; // From screenshot (approx)
        // Let's find the actual company ID first
        const company = await mongoose.connection.db.collection('companies').findOne({ name: /Yatree/i });
        const cid = company ? company._id : companyId;
        console.log(`Using Company ID: ${cid}`);

        const month = 2; // February
        const year = 2026;

        const drivers = await User.find({ role: 'Driver' }).select('name mobile dailyWage');
        const abhay = drivers.find(d => d.name.includes('Abhay'));

        if (abhay) {
            console.log(`Found Abhay: ${abhay._id}`);

            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

            const attendance = await Attendance.find({
                driver: abhay._id,
                status: 'completed',
                date: { $gte: "2026-02-01", $lte: "2026-02-28" }
            });
            console.log(`Abhay Attendance count: ${attendance.length}`);

            const advQuery = {
                driver: abhay._id,
                date: { $gte: startOfMonth, $lte: endOfMonth }
            };
            const advs = await Advance.find(advQuery);
            console.log(`Abhay Advance count: ${advs.length}`);

            // Check all advances for Abhay without date filter
            const allAdvs = await Advance.find({ driver: abhay._id });
            console.log(`Abhay Total Advance count (no date): ${allAdvs.length}`);

            // SIMULATE getDriverSalarySummary logic
            const totalEarned = attendance.reduce((sum, att) => {
                const wage = att.dailyWage || abhay.dailyWage || 500;
                const bonuses = (att.punchOut?.allowanceTA || 0) + (att.punchOut?.nightStayAmount || 0);
                return sum + wage + bonuses;
            }, 0);
            const totalAdvances = allAdvs.reduce((sum, adv) => sum + (adv.amount || 0), 0);

            console.log(`Calculated for Abhay -> TotalEarned: ${totalEarned}, TotalAdvances: ${totalAdvances}`);
        }

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
