const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const Attendances = mongoose.connection.db.collection('attendances');
        const docs = await Attendances.find({}).toArray();
        let found = false;
        for (let d of docs) {
            const str = JSON.stringify(d);
            if (str.includes('Generated')) {
                console.log(`ATTENDANCE_GEN: ID=${d._id}, Date=${d.date}, Driver=${d.driver}`);
                found = true;
            }
        }

        const Advances = mongoose.connection.db.collection('advances');
        const advDocs = await Advances.find({}).toArray();
        for (let a of advDocs) {
            const str = JSON.stringify(a);
            if (str.includes('Generated')) {
                console.log(`ADVANCE_GEN: ID=${a._id}, Date=${a.date}, Driver=${a.driver}, Remark="${a.remark}"`);
                found = true;
            }
        }

        if (!found) console.log('NO "Generated" found in Attendances or Advances.');
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

run();
