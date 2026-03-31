const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const v = await Vehicle.findOne({});
        console.log(`Vehicle Company: ${v?.company}`);
        console.log(`Vehicle Number: ${v?.carNumber}`);
        console.log(`Company of Abhay ID (str): 69caf340162fc71dc07307d1`);
        
        const count = await Vehicle.countDocuments({ company: '69caf340162fc71dc07307d1' });
        console.log(`Count with string ID: ${count}`);
        
        const countObj = await Vehicle.countDocuments({ company: new mongoose.Types.ObjectId('69caf340162fc71dc07307d1') });
        console.log(`Count with ObjectId: ${countObj}`);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
