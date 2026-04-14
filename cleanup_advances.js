const mongoose = require('mongoose');

// Extracted from src/config/db.js since dotenv is unreliable here
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

// Model Schema
const advanceSchema = new mongoose.Schema({
    remark: String
}, { strict: false });
const Advance = mongoose.model('Advance', advanceSchema);

const run = async () => {
    try {
        console.log('Connecting to MongoDB using fallback URI...');
        await mongoose.connect(latestAtlasURI);
        console.log('Connected to MongoDB');

        // Delete "Auto Generated" advances
        const result = await Advance.deleteMany({
            remark: { $regex: /Daily Salary - Auto Generated/ }
        });

        console.log(`Deleted ${result.deletedCount} incorrect auto-generated advance records.`);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
