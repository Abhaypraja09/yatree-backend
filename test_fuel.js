const mongoose = require('mongoose');
require('dotenv').config();
const Fuel = require('./src/models/Fuel');
const Vehicle = require('./src/models/Vehicle');
const { DateTime } = require('luxon');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    try {
        const istNow = DateTime.now().setZone('Asia/Kolkata');
        const startOfMonth = istNow.startOf('month').toJSDate();
        
        const vehicles = await Vehicle.find({ company: '698ac8b01587e01651a49443' }).lean();
        const monthlyFuel = await Fuel.find({ 
            company: '698ac8b01587e01651a49443',
            date: { $gte: startOfMonth }
        }).lean();
        
        // Find 9821 vehicle
        const v = vehicles.find(v => v.carNumber.includes('9821'));
        if (!v) { console.log('Vehicle not found'); process.exit(0); }
        
        const vFuel = monthlyFuel.filter(f => f.vehicle?.toString() === v._id.toString());
        const totalAmount = vFuel.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
        const totalLiters = vFuel.reduce((sum, f) => sum + (Number(f.quantity) || 0), 0);
        
        console.log(`\n=== ${v.carNumber} - April 2026 Fuel ===`);
        console.log(`Total Amount: ₹${totalAmount}`);
        console.log(`Total Liters: ${totalLiters}L`);
        console.log(`Records found: ${vFuel.length}`);
        console.log(`\nIndividual records:`);
        vFuel.forEach(f => {
            console.log(`  Date: ${new Date(f.date).toDateString()} | Amount: ₹${f.amount} | Qty: ${f.quantity}L`);
        });
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});
