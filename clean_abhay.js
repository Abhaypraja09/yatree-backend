const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const Advance = mongoose.model('Advance', new mongoose.Schema({ remark: String, amount: Number, driver: mongoose.Schema.Types.ObjectId, date: Date }, { strict: false }));
const User = mongoose.model('User', new mongoose.Schema({ name: String }));

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const abhay = await User.findOne({ name: /Abhay/i });
        if (!abhay) {
            console.log('Abhay not found');
            process.exit();
        }
        console.log(`Found Abhay: ${abhay._id}`);

        const advances = await Advance.find({ driver: abhay._id });
        console.log(`Abhay has ${advances.length} advances`);

        advances.forEach(a => {
            console.log(`- Amount: ${a.amount}, Remark: "${a.remark}"`);
        });

        // Delete any salary related for Abhay specifically
        const result = await Advance.deleteMany({
            driver: abhay._id,
            remark: { $regex: /Salary|Generated/i }
        });
        console.log(`Deleted for Abhay: ${result.deletedCount}`);

        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

run();
