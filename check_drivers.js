const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const User = mongoose.model('User', new mongoose.Schema({ name: String }));

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const u1 = await User.findById('699296b6a94eda1844b175db');
        const u2 = await User.findById('698b1364c64b8814fd74c43e');
        console.log(`Driver 1: ${u1 ? u1.name : 'Unknown'}`);
        console.log(`Driver 2: ${u2 ? u2.name : 'Unknown'}`);
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

run();
