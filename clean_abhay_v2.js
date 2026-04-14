const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const Advance = mongoose.model('Advance', new mongoose.Schema({ remark: String, amount: Number, driver: mongoose.Schema.Types.ObjectId, date: Date }, { strict: false }));
const User = mongoose.model('User', new mongoose.Schema({ name: String, mobile: String }));

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const abhay = await User.findOne({ mobile: '9660953135' });
        if (!abhay) {
            console.log('Abhay (9660953135) not found');
            const allAbhays = await User.find({ name: /Abhay/i });
            allAbhays.forEach(u => console.log(`Name: ${u.name}, Mobile: ${u.mobile}, ID: ${u._id}`));
            process.exit();
        }
        console.log(`Found Abhay: ${abhay.name}, ID: ${abhay._id}`);

        const advances = await Advance.find({ driver: abhay._id });
        console.log(`Abhay has ${advances.length} advances`);
        advances.forEach(a => console.log(`- Amt: ${a.amount}, Remark: "${a.remark}"`));

        const result = await Advance.deleteMany({
            driver: abhay._id,
            remark: { $regex: /Salary|Generated/i }
        });
        console.log(`Deleted: ${result.deletedCount}`);
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

run();
