const mongoose = require('mongoose');
const Maintenance = require('./src/models/Maintenance');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const coIdStr = '69caf340162fc71dc07307d1';
    const coIdObj = new mongoose.Types.ObjectId(coIdStr);
    
    console.log('COUNT_BY_OBJ:', await Maintenance.countDocuments({ company: coIdObj }));
    console.log('COUNT_BY_STR:', await Maintenance.countDocuments({ company: coIdStr }));
    
    await mongoose.disconnect();
}
check();
