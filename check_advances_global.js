const mongoose = require('mongoose');

async function check() {
    const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";
    await mongoose.connect(latestAtlasURI);

    const companyId = '6982e8b7d0b069a49db197b9';
    const Advance = mongoose.model('Advance', new mongoose.Schema({}, { strict: false }));
    const count = await Advance.countDocuments({ company: new mongoose.Types.ObjectId(companyId) });
    console.log('Total Advances for Company:', count);

    const lastAdv = await Advance.findOne({ company: new mongoose.Types.ObjectId(companyId) }).sort({ date: -1 });
    console.log('Last Advance Date:', lastAdv?.date);
    console.log('Last Advance Amount:', lastAdv?.amount);

    process.exit(0);
}
check();
