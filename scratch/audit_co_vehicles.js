const mongoose = require('mongoose');
const path = require('path');
const Vehicle = require(path.join(__dirname, '../src/models/Vehicle'));
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function audit() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const targetCo = '698ac8b01587e01651a49443';
        
        const internal = await Vehicle.countDocuments({ 
            company: new mongoose.Types.ObjectId(targetCo), 
            isOutsideCar: { $ne: true } 
        });
        
        console.log(`Internal Fleet for Company ${targetCo}:`, internal);
    } catch (err) {
        console.error('Audit failed:', err.message);
    } finally {
        process.exit();
    }
}
audit();
