const mongoose = require('mongoose');
require('dotenv').config();
const Vehicle = require('./src/models/Vehicle');
const BorderTax = require('./src/models/BorderTax');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    try {
        const vehicles = await Vehicle.find({ company: '698ac8b01587e01651a49443' }).lean();
        const monthlyBorderTax = await BorderTax.find({ company: '698ac8b01587e01651a49443' }).lean();

        const dataContext = vehicles.map(v => {
            const vBorderTaxes = monthlyBorderTax.filter(b => b.vehicle?.toString() === v._id.toString());
            const vFastags = (v.fastagHistory || []).filter(f => {
                const fDate = new Date(f.date);
                // current month logic as per aiController
                const istNow = new Date('2026-04-25');
                return fDate.getMonth() === istNow.getMonth() && fDate.getFullYear() === istNow.getFullYear();
            });
            
            return {
                carNumber: v.carNumber,
                borderTaxThisMonth: vBorderTaxes.reduce((sum, b) => sum + (Number(b.amount) || 0), 0),
                fastagThisMonth: vFastags.reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
            };
        });
        
        console.log(JSON.stringify(dataContext.find(v => v.carNumber.includes('9822')), null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});
