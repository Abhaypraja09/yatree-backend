const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Attendance = require('./src/models/Attendance');

dotenv.config();

const verify = async () => {
    try {
        const uri = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const targetDate = '2026-02-18';
        const atts = await Attendance.find({ date: targetDate });
        console.log(`Found ${atts.length} records for ${targetDate}`);
        atts.forEach(a => {
            console.log(`- ID: ${a._id}, Company: ${a.company}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

verify();
