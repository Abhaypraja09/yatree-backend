
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const cId = '69caf340162fc71dc07307d1'; // Abhay
    
    // Define schemas if models are not registered
    const schemas = {
        User: new mongoose.Schema({}, { strict: false }),
        Vehicle: new mongoose.Schema({}, { strict: false }),
        Attendance: new mongoose.Schema({}, { strict: false }),
        Fuel: new mongoose.Schema({}, { strict: false }),
        Maintenance: new mongoose.Schema({}, { strict: false }),
        Parking: new mongoose.Schema({}, { strict: false }),
        Advance: new mongoose.Schema({}, { strict: false }),
        BorderTax: new mongoose.Schema({}, { strict: false }),
        AccidentLog: new mongoose.Schema({}, { strict: false }),
        PartsWarranty: new mongoose.Schema({}, { strict: false }),
        Event: new mongoose.Schema({}, { strict: false })
    };

    for (const [name, schema] of Object.entries(schemas)) {
        let Model;
        try {
            Model = mongoose.model(name);
        } catch (e) {
            Model = mongoose.model(name, schema);
        }
        const count = await Model.countDocuments({ company: cId });
        console.log(`${name}: ${count}`);
    }
    process.exit(0);
}
run();
