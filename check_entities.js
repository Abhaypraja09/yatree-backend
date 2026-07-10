const mongoose = require('mongoose');
const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';

mongoose.connect(uri).then(async () => {
    const User = mongoose.model('User', new mongoose.Schema({ name: String, mobile: String, driverType: String, role: String, company: mongoose.Schema.Types.ObjectId, password: String, status: String, dailyWage: Number }, { strict: false }));
    const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({ carNumber: String, company: mongoose.Schema.Types.ObjectId, type: String, currentDriver: mongoose.Schema.Types.ObjectId }, { strict: false }));
    const Company = mongoose.model('Company', new mongoose.Schema({ name: String }));
    
    const company = await Company.findOne();
    if (!company) { console.log("No company found"); process.exit(1); }

    // Find or create Ram
    let ram = await User.findOne({ name: /Ram/i, driverType: 'Bus' });
    
    // Find or create Shyam1
    let shyam = await User.findOne({ name: /Shyam1/i, driverType: 'Bus' });
    if (!shyam) {
        shyam = await User.create({
            name: 'Shyam1',
            mobile: '9999999991',
            driverType: 'Bus',
            role: 'driver',
            company: company._id,
            status: 'active',
            dailyWage: 500
        });
        console.log("Created driver Shyam1");
    }

    // Find or create Bus 1
    let bus1 = await Vehicle.findOne({ carNumber: /RJ27TA0001/i });
    if (bus1) {
        bus1.currentDriver = ram._id;
        await bus1.save();
    }
    
    // Find or create Bus 2
    let bus2 = await Vehicle.findOne({ carNumber: /RJ27TA0002/i });
    if (!bus2) {
        bus2 = await Vehicle.create({
            carNumber: 'RJ27TA0002 (BUS)',
            company: company._id,
            type: 'fleet',
            model: 'Tata Bus',
            currentDriver: shyam._id
        });
        console.log("Created vehicle RJ27TA0002");
    } else {
        bus2.currentDriver = shyam._id;
        await bus2.save();
    }

    console.log(`Ram: ${ram._id}, Bus1: ${bus1._id}`);
    console.log(`Shyam1: ${shyam._id}, Bus2: ${bus2._id}`);

    process.exit(0);
});
