const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const User = mongoose.model('User', new mongoose.Schema({ name: String, mobile: String }));

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const users = await User.find({ name: /Abhay/i });
        console.log(`Found ${users.length} Abhays`);
        users.forEach(u => console.log(`Name: ${u.name}, Mobile: ${u.mobile}, ID: ${u._id}`));
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

run();
