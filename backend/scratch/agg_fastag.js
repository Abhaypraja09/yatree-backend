const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function runAgg() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const res = await mongoose.connection.db.collection('vehicles').aggregate([
            { $unwind: '$fastagHistory' },
            { 
                $match: { 
                    'fastagHistory.date': { 
                        $gte: new Date('2026-01-01'), 
                        $lte: new Date('2026-05-31') // Include May for comparison
                    } 
                } 
            },
            { 
                $group: { 
                    _id: { 
                        year: { $year: '$fastagHistory.date' }, 
                        month: { $month: '$fastagHistory.date' } 
                    }, 
                    total: { $sum: '$fastagHistory.amount' },
                    count: { $sum: 1 }
                } 
            }
        ]).toArray();
        console.log(res);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

runAgg();
