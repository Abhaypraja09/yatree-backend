const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const Advance = mongoose.model('Advance', new mongoose.Schema({ remark: String, amount: Number, driver: mongoose.Schema.Types.ObjectId, date: Date, status: String }, { strict: false }));
const User = mongoose.model('User', new mongoose.Schema({ name: String }));

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const abhay = await User.findOne({ name: /Abhay/i });
        if (!abhay) { console.log('Abhay not found'); process.exit(); }

        console.log(`Checking logic for Abhay (${abhay._id})...`);

        // 1. Raw DB check
        const rawCount = await Advance.countDocuments({ driver: abhay._id });
        console.log(`[DB RAW] Total Advances in DB: ${rawCount}`);

        // 2. Simulate Driver Ledger Query
        const ledgerAdvances = await Advance.find({
            driver: abhay._id,
            remark: { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ }
        });
        console.log(`[LEDGER API] Advances visible in Driver Ledger: ${ledgerAdvances.length}`);

        // 3. Simulate Salary Summary / Dashboard Query
        const summaryAdvances = await Advance.find({
            driver: abhay._id,
            remark: { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ }
        });
        console.log(`[DASHBOARD API] Advances visible in Admin Dashboard: ${summaryAdvances.length}`);

        if (rawCount === 0 && ledgerAdvances.length === 0 && summaryAdvances.length === 0) {
            console.log('\nSUCCESS: System is clean. No ghost advances.');
        } else {
            console.log('\nWARNING: Discrepancy found.');
        }

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
