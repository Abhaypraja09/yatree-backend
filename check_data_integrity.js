const mongoose = require('mongoose');
const uri = "mongodb://prajapatmayank174_db_user:Mayank12345@yattridb-shard-00-00.ojuesoz.mongodb.net:27017,yattridb-shard-00-01.ojuesoz.mongodb.net:27017,yattridb-shard-00-02.ojuesoz.mongodb.net:27017/taxi-fleet?ssl=true&replicaSet=atlas-z0yck0-shard-0&authSource=admin&retryWrites=true&w=majority";

const checkData = async () => {
    try {
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

        const Fuel = mongoose.connection.db.collection('fuels');
        const countFuel = await Fuel.countDocuments();
        console.log(`Fuel Entries: ${countFuel}`);

        const Parking = mongoose.connection.db.collection('parkings');
        const countParking = await Parking.countDocuments();
        console.log(`Parking Entries: ${countParking}`);

        const Maintenance = mongoose.connection.db.collection('maintenances');
        const countMaintenance = await Maintenance.countDocuments();
        console.log(`Maintenance Entries: ${countMaintenance}`);

        const Advance = mongoose.connection.db.collection('advances');
        const countAdvance = await Advance.countDocuments();
        console.log(`Advances Entries: ${countAdvance}`);


        const admin = new mongoose.mongo.Admin(mongoose.connection.db);
        const listDatabases = await admin.listDatabases();
        console.log('Databases:', listDatabases.databases.map(db => db.name));


        console.log('--- Checking Local DB ---');
        try {
            const localUri = "mongodb://127.0.0.1:27017/taxi-fleet";
            const localConn = await mongoose.createConnection(localUri).asPromise();
            console.log('Connected to Local DB');

            const localFuel = localConn.db.collection('fuels');
            const localCountFuel = await localFuel.countDocuments();
            console.log(`Local Fuel Entries: ${localCountFuel}`);

            const localParking = localConn.db.collection('parkings');
            const localCountParking = await localParking.countDocuments();
            console.log(`Local Parking Entries: ${localCountParking}`);

            const localMaintenance = localConn.db.collection('maintenances');
            const localCountMaintenance = await localMaintenance.countDocuments();
            console.log(`Local Maintenance Entries: ${localCountMaintenance}`);

            const localAdmin = new mongoose.mongo.Admin(localConn.db);
            const localDbs = await localAdmin.listDatabases();
            console.log('Local Databases:', localDbs.databases.map(d => d.name));

            await localConn.close();
        } catch (e) {
            console.log('Could not connect to local DB:', e.message);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkData();
