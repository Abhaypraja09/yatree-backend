const mongoose = require('mongoose');
const path = require('path');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const Advance = require('./src/models/Advance');
const User = require('./src/models/User');

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        console.log('Connected');

        const abhay = await User.findOne({ mobile: '9660953135' });
        console.log(`Abhay ID: ${abhay ? abhay._id : 'Not Found'}`);

        if (abhay) {
            const advs = await Advance.find({ driver: abhay._id });
            console.log(`Abhay Advances (via Model): ${advs.length}`);
            advs.forEach(a => console.log(`- ${a.remark}: ${a.amount}`));
        }

        const allAdvs = await Advance.find({});
        console.log(`All Advances (via Model): ${allAdvs.length}`);
        allAdvs.forEach(a => console.log(`- [${a.driver}] ${a.remark}: ${a.amount}`));

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
