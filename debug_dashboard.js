const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');
const User = require('./src/models/User');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const companyId = '697989c1237335b9c919531f'; // GoGetGo

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const vehiclesWithExpiringDocs = await Vehicle.find({
        company: companyId,
        'documents.expiryDate': { $lte: thirtyDaysFromNow }
    }).select('carNumber documents');

    console.log(`Vehicles matching query: ${vehiclesWithExpiringDocs.length}`);

    const expiringAlerts = [];

    vehiclesWithExpiringDocs.forEach(v => {
        v.documents.forEach(doc => {
            if (doc.expiryDate && doc.expiryDate <= thirtyDaysFromNow) {
                expiringAlerts.push({
                    carNumber: v.carNumber,
                    documentType: doc.documentType,
                    expiryDate: doc.expiryDate
                });
            }
        });
    });

    console.log('Expiring Alerts:', JSON.stringify(expiringAlerts, null, 2));
    process.exit();
}
check();
