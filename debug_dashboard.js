const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: 'c:/Users/ABHAY/OneDrive/Desktop/TEXI/yatree-backend/.env' });

const dbUrl = process.env.MONGO_URI;
console.log('Connecting to:', dbUrl);

async function run() {
    await mongoose.connect(dbUrl);
    console.log('Connected to DB');

    // Get the company ID (I assume it's Yatree)
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({ role: 'Admin' }).toArray();
    const companyId = users[0].company;
    console.log('Company ID:', companyId);

    // Let's check Outside Cars
    const monthPrefix = '2026-06';
    const cars = await db.collection('vehicles').find({
        company: companyId,
        isOutsideCar: true
    }).toArray();

    let eTotal = 0;
    for (const c of cars) {
        if (c.eventId && c.eventId !== 'undefined' && c.eventId !== '') {
            console.log('Event Outside Car found:', c.carNumber, c.dutyAmount, c.eventId);
            eTotal += Number(c.dutyAmount) || 0;
        }
    }
    console.log('Outside car event total (manual):', eTotal);

    // Let's check Attendances
    const atts = await db.collection('attendances').find({
        company: companyId,
        date: { $regex: '^2026-06' }
    }).toArray();

    let fTotal = 0;
    for (const a of atts) {
        if (a.eventId && a.eventId !== 'undefined' && String(a.eventId).trim() !== '') {
            console.log('Event Attendance found:', a._id, a.dailyWage, a.eventId);
            fTotal += Number(a.dailyWage) || 0;
        }
    }
    console.log('Fleet Event Total (manual):', fTotal);
    
    // Check aggregations directly to see what the server is doing
    const aggResult = await db.collection('vehicles').aggregate([
        { $match: { company: companyId, isOutsideCar: true } }, 
        { $project: { 
            month: { $substr: [{ $ifNull: ["$carNumber", ""] }, { $add: [{ $indexOfBytes: ["$carNumber", "#"] }, 1] }, 7] }, 
            isBuy: { $eq: [{ $ifNull: ["$transactionType", "Buy"] }, "Buy"] }, 
            amount: "$dutyAmount", 
            isE: { $not: { $in: [{ $ifNull: ["$eventId", null] }, [null, "", "undefined"]] } } 
        } }, 
        { $facet: { 
            e: [{ $match: { month: monthPrefix, isE: true } }, { $group: { _id: null, t: { $sum: "$amount" } } }], 
            o: [{ $match: { month: monthPrefix, isE: false, isBuy: true } }, { $group: { _id: null, t: { $sum: "$amount" } } }] 
        } }
    ]).toArray();

    console.log('Aggregation result:', JSON.stringify(aggResult, null, 2));

    process.exit(0);
}

run().catch(console.error);
