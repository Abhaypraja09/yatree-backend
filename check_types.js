const mongoose = require('mongoose');
const vehicleSchema = new mongoose.Schema({ company: mongoose.Schema.Types.Mixed, status: String, isOutsideCar: Boolean, carNumber: String });
const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true');
        const cars = await Vehicle.find({ isOutsideCar: { $ne: true } });
        cars.forEach(c => {
            const comp = c.company;
            const type = typeof comp;
            const isObjectId = comp instanceof mongoose.Types.ObjectId;
            console.log(`Car: ${c.carNumber}, Comp: ${comp}, Type: ${type}, isId: ${isObjectId}`);
        });
        process.exit();
    } catch (err) {
        process.exit(1);
    }
};
connectDB();
