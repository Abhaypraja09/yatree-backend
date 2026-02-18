const mongoose = require('mongoose');

async function check() {
    const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";
    await mongoose.connect(latestAtlasURI);

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const ids = ['6993281b2ce72b5bec5721ce', '698abf58f2e4d5f19c74f951', '69915f7538b3cc58c9461524'];
    for (const id of ids) {
        const driver = await User.findById(id);
        console.log(`Driver ${id}:`, {
            name: driver?.name,
            salary: driver?.salary,
            dailyWage: driver?.dailyWage,
            isFreelancer: driver?.isFreelancer
        });
    }

    process.exit(0);
}
check();
