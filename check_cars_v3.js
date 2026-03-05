const mongoose = require('mongoose');
const vehicleSchema = new mongoose.Schema({ company: mongoose.Schema.Types.ObjectId, status: String, isOutsideCar: Boolean, carNumber: String });
const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true');
        const cars = await Vehicle.find({ company: '6982e8b7d0b069a49db197b9', isOutsideCar: { $ne: true } });
        console.log('Internal Cars:', cars.length);
        cars.forEach(c => console.log(`Num: ${c.carNumber}, Status: ${c.status}`));
        process.exit();
    } catch (err) {
        process.exit(1);
    }
};
connectDB();
