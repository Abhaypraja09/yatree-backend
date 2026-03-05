const mongoose = require('mongoose');
const vehicleSchema = new mongoose.Schema({ company: mongoose.Schema.Types.Mixed, status: String, isOutsideCar: Boolean, carNumber: String });
const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true');
        const cars = await Vehicle.find({ isOutsideCar: { $ne: true } });
        const summary = {};
        cars.forEach(c => {
            const compStr = c.company ? c.company.toString() : 'null';
            const isId = c.company instanceof mongoose.Types.ObjectId;
            const key = `${compStr}_id:${isId}`;
            if (!summary[key]) summary[key] = [];
            summary[key].push(c.carNumber);
        });
        console.log(JSON.stringify(summary, null, 2));
        process.exit();
    } catch (err) {
        process.exit(1);
    }
};
connectDB();
