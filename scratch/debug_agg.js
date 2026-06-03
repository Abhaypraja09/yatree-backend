require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yatree').then(async () => {
    const Vehicle = require('../src/models/Vehicle');
    const monthPrefix = '2026-06';
    const res = await Vehicle.aggregate([
            { $match: { isOutsideCar: true } },
            {
                $project: {
                    month: { $substr: [{ $ifNull: ["$carNumber", ""] }, { $add: [{ $indexOfBytes: ["$carNumber", "#"] }, 1] }, 7] },
                    amount: "$dutyAmount",
                    isE: { $ne: [{ $ifNull: ["$eventId", null] }, null] }
                }
            },
            {
                $facet: {
                    e: [
                        { $match: { month: monthPrefix, isE: true } },
                        { $group: { _id: null, t: { $sum: "$amount" } } }
                    ]
                }
            }
        ]);
    console.log(JSON.stringify(res));
    process.exit(0);
});
