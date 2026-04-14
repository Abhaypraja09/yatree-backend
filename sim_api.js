const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function check() {
    await mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true');
    const User = mongoose.connection.model('User', new mongoose.Schema({ company: mongoose.Schema.Types.ObjectId }));
    const admin = await User.findOne({role: 'Admin'});
    console.log("Admin Company:", admin.company.toString());

    // Call the function code simulation...
    const Attendance = mongoose.connection.model('Attendance', new mongoose.Schema({
        company: mongoose.Schema.Types.ObjectId,
        pendingExpenses: Array,
        vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
        driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        date: String
    }));
    const Vehicle = mongoose.connection.model('Vehicle', new mongoose.Schema({
        carNumber: String
    }));
    
    const atts = await Attendance.find({
        company: admin.company,
        'pendingExpenses.type': { $in: ['other', 'parking'] }
    }).populate('vehicle').populate('driver');
    
    console.log(`Found ${atts.length} attendance records with pending expenses.`);
    atts.forEach(doc => {
        doc.pendingExpenses.forEach(exp => {
            if (exp.type === 'other' || exp.type === 'parking') {
                console.log(`- Exp ID: ${exp._id}, Category: ${exp.fuelType || 'N/A'}, Amount: ${exp.amount}, Status: ${exp.status}`);
            }
        });
    });

    process.exit(0);
}
check();
