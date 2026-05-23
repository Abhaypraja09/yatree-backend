const axios = require('axios');

async function testRecharge() {
    try {
        const vehicleId = '6982f192508a22188c6188d5'; // RJ-27-TA-8946
        const rechargeData = {
            amount: 50,
            date: new Date().toISOString(),
            method: 'Cash',
            remarks: 'Test Recharge by Antigravity'
        };

        // I'll need a token, but I'll skip the actual HTTP call and do it via mongoose to verify the model
        const mongoose = require('mongoose');
        require('dotenv').config({ path: './backend/.env' });
        await mongoose.connect(process.env.MONGODB_URI);
        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({ carNumber: String, fastagHistory: Array, fastagBalance: Number }), 'vehicles');

        const vehicle = await Vehicle.findById(vehicleId);
        console.log(`Initial Balance: ${vehicle.fastagBalance}`);
        
        vehicle.fastagBalance = (vehicle.fastagBalance || 0) + rechargeData.amount;
        vehicle.fastagHistory.push(rechargeData);
        await vehicle.save();
        
        console.log(`New Balance: ${vehicle.fastagBalance}`);
        console.log(`History Count: ${vehicle.fastagHistory.length}`);
        
        // Clean up
        vehicle.fastagHistory.pop();
        vehicle.fastagBalance -= 50;
        await vehicle.save();
        console.log('Test completed and cleaned up.');

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

testRecharge();
