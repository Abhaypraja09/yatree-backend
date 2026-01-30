const { sendSMS } = require('./src/utils/smsService');
require('dotenv').config();

async function testTwilio() {
    const mobile = '9660953135';
    const message = "Abhay, Twilio SMS test working! Document expiry system is now active. [FleetCRM]";

    console.log(`Testing REAL SMS via Twilio to ${mobile}...`);

    if (process.env.TWILIO_AUTH_TOKEN === 'your_auth_token_here') {
        console.log("ERROR: Please update TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER in your .env file first!");
        process.exit(1);
    }

    const success = await sendSMS(mobile, message);
    if (success) {
        console.log("Check your phone! If you didn't receive it, verify your Twilio credentials.");
    } else {
        console.log("Failed to send message. Check the error above.");
    }
    process.exit();
}

testTwilio();
