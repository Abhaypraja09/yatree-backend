const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User');
const Attendance = require('./src/models/Attendance');
const Advance = require('./src/models/Advance');
const Allowance = require('./src/models/Allowance');
const Loan = require('./src/models/Loan');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ name: /Madho Singh/i });
        if (!user) {
            console.log('User not found');
            return;
        }

        const month = "04";
        const year = "2024";
        const startStr = `${year}-${month}-01`;
        const endStr = `${year}-${month}-30`;
        const startJS = new Date(`${year}-${month}-01`);
        const endJS = new Date(`${year}-${month}-31`);

        const atts = await Attendance.find({ driver: user._id, date: { $gte: startStr, $lte: endStr } });
        const advs = await Advance.find({ driver: user._id, date: { $gte: startJS, $lte: endJS } });
        const allows = await Allowance.find({ driver: user._id, date: { $gte: startJS, $lte: endJS } });
        const loans = await Loan.find({ driver: user._id });

        console.log('Driver:', user.name, user._id);
        console.log('Daily Wage:', user.dailyWage);
        console.log('Attendance:', atts.length);
        console.log('Advances:', JSON.stringify(advs, null, 2));
        console.log('Allowances:', JSON.stringify(allows, null, 2));
        
        let totalWages = 0;
        let totalBonuses = 0;
        atts.forEach(a => {
            totalWages += (a.dailyWage || 0);
            totalBonuses += (a.punchOut?.allowanceTA || 0) + (a.punchOut?.nightStayAmount || 0);
            if (a.outsideTrip?.bonusAmount) {
                const bonus = Math.max(0, a.outsideTrip.bonusAmount - (a.punchOut?.allowanceTA || 0) - (a.punchOut?.nightStayAmount || 0));
                totalBonuses += bonus;
            }
        });

        console.log('Total Wages:', totalWages);
        console.log('Total Bonuses:', totalBonuses);

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};

check();
