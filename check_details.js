const mongoose = require('mongoose');
const vehicleSchema = new mongoose.Schema({ company: mongoose.Schema.Types.Mixed, status: String, isOutsideCar: Boolean, carNumber: String });
const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true');
        const cars = await Vehicle.find({ company: new mongoose.Types.ObjectId('6982e8b7d0b069a49db197b9') });
        console.log('Total for Comp 6982:', cars.length);
        cars.forEach(c => {
            console.log(`'${c.carNumber}': status='${c.status}', isOutside=${c.isOutsideCar}`);
        });
        process.exit();
    } catch (err) {
        process.exit(1);
    }
};
connectDB();
