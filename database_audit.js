const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const Advance = mongoose.connection.db.collection('advances');
        const abhayId = new mongoose.Types.ObjectId('698b03eb6bd90f103e7c9abc');

        // Final count of ALL advances in the system
        const total = await Advance.countDocuments({});
        const abhayCount = await Advance.countDocuments({ driver: abhayId });
        const allGenerates = await Advance.countDocuments({ remark: /Generated|Salary/i });

        console.log(`TOTAL ADVANCES IN SYSTEM: ${total}`);
        console.log(`ABHAY ADVANCES: ${abhayCount}`);
        console.log(`SALARY-RELATED ADVANCES LEFT: ${allGenerates}`);

        const allAdvs = await Advance.find({}).toArray();
        allAdvs.forEach(a => console.log(`- Driver: ${a.driver}, Amt: ${a.amount}, Remark: "${a.remark}"`));

        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

run();
