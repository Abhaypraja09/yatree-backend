const mongoose = require('mongoose');

async function list() {
    const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";
    await mongoose.connect(latestAtlasURI);
    const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }));
    const companies = await Company.find();
    console.log('Companies:', companies.map(c => ({ id: c._id, name: c.name })));

    const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
    const lastAtt = await Attendance.findOne().sort({ createdAt: -1 });
    console.log('Last Attendance Date:', lastAtt?.date);
    console.log('Last Attendance Company:', lastAtt?.company);

    process.exit(0);
}
list();
