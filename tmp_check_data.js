const mongoose = require('mongoose');

async function run() {
    try {
        await mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true');
        const Maintenance = mongoose.model('Maintenance', new mongoose.Schema({ company: mongoose.Schema.Types.ObjectId, amount: Number, billDate: Date, createdAt: Date }));
        
        const last = await Maintenance.findOne({ 
            company: new mongoose.Types.ObjectId('698ac8b01587e01651a49443')
        }).sort({ createdAt: -1 }).lean();

        console.log('Last Maintenance Record:', JSON.stringify(last, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

run();
