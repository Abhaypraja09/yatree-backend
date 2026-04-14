const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const m = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false, collection: 'attendances' }));

    // Find latest completed
    const sample = await m.findOne({ status: 'completed' }).sort({ date: -1 });
    if (sample) {
        console.log('Sample Completed Date:', sample.date);
        console.log('Sample Completed JSON:', JSON.stringify(sample, null, 2));
    }

    process.exit();
}

check().catch(e => { console.error(e); process.exit(1); });
