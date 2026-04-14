const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const Advance = mongoose.model('Advance', new mongoose.Schema({ remark: String }, { strict: false }));

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        console.log('Connected');

        const allAdvances = await Advance.find({}).select('remark amount date');
        console.log('Total Advances in DB:', allAdvances.length);

        const autoGen = allAdvances.filter(a => a.remark && /Generated|Salary/i.test(a.remark));
        console.log('Total Auto/Salary related advances found:', autoGen.length);

        autoGen.slice(0, 10).forEach(a => {
            console.log(`- [${a.date}] ${a.remark}: ${a.amount}`);
        });

        // Actually delete them this time with a broader match
        const result = await Advance.deleteMany({
            remark: { $regex: /Generated|Salary/i }
        });
        console.log('Aggressive deletion result:', result.deletedCount);

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
