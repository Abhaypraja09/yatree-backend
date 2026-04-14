const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User');

async function checkArjun() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const arjun = await User.findOne({ name: /Arjun Bhat/i });
        if (arjun) {
            console.log('Arjun User details:');
            console.log(JSON.stringify(arjun, null, 2));
        } else {
            console.log('Arjun not found');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkArjun();
