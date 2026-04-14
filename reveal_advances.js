const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const Advance = mongoose.model('Advance', new mongoose.Schema({ remark: String, amount: Number, driver: mongoose.Schema.Types.ObjectId, date: Date }, { strict: false }));
const User = mongoose.model('User', new mongoose.Schema({ name: String }));

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const all = await Advance.find({}).populate('driver', 'name');
        console.log('--- REVEALING REMAINING ADVANCES ---');
        all.forEach(a => {
            console.log(`Driver: ${a.driver?.name || 'Unknown'}, Amount: ${a.amount}, Date: ${a.date}, Remark: "${a.remark}"`);
        });
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

run();
