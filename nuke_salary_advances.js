const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const Advance = mongoose.connection.db.collection('advances');

        const countBefore = await Advance.countDocuments({});
        console.log(`Initial advances count: ${countBefore}`);

        const result = await Advance.deleteMany({
            remark: { $regex: /Generated|Salary/i }
        });
        console.log(`Deleted ${result.deletedCount} salary-related advances.`);

        const allRemaining = await Advance.find({}).toArray();
        console.log(`Remaining advances (${allRemaining.length}):`);
        allRemaining.forEach(a => {
            console.log(`- Amt: ${a.amount}, Remark: "${a.remark}", Driver: ${a.driver}`);
        });

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
