const mongoose = require('mongoose');

async function check() {
    const MONGODB_URI = "mongodb+srv://prajapatmayank174_db_user:Mayank12345@yattridb.ojuesoz.mongodb.net/taxi-fleet?retryWrites=true&w=majority&appName=YattriDB";
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('CONNECTED');
        const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
        const Advance = mongoose.model('Advance', new mongoose.Schema({}, { strict: false }));

        const today = "2026-02-17";
        const attCount = await Attendance.countDocuments({ date: today });
        const advCount = await Advance.countDocuments({
            date: {
                $gte: new Date("2026-02-17T00:00:00Z"),
                $lte: new Date("2026-02-17T23:59:59Z")
            }
        });

        console.log('Attendance count for 2026-02-17:', attCount);
        console.log('Advance count for 2026-02-17 (UTC):', advCount);

        const lastAtt = await Attendance.findOne({ date: today }).sort({ createdAt: -1 });
        console.log('Last attendance:', lastAtt);

        const lastAdv = await Advance.findOne().sort({ date: -1 });
        console.log('Last advance date:', lastAdv?.date);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
