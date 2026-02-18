const mongoose = require('mongoose');

async function check() {
    const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";
    await mongoose.connect(latestAtlasURI);

    const companyId = '6982e8b7d0b069a49db197b9';
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
    const allAtt = await Attendance.find({
        company: new mongoose.Types.ObjectId(companyId),
        date: "2026-02-17"
    });
    console.log('Driver IDs for Feb 17:');
    allAtt.forEach(a => console.log(a.driver.toString()));

    process.exit(0);
}
check();
