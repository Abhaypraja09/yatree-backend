const twilio = require('twilio');
require('dotenv').config();

/**
 * Sends an SMS notification using Twilio.
 */
const sendSMS = async (mobile, message) => {
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

        // Validation
        if (!accountSid || !authToken || !twilioNumber || authToken === 'your_auth_token_here') {
            console.log(`\n--- [MOCK] SMS NOTIFICATION ---`);
            console.log(`Notice: Twilio not configured. Printing to console.`);
            console.log(`To: ${mobile}`);
            console.log(`Message: ${message}`);
            console.log(`-------------------------------\n`);
            return true;
        }

        const client = twilio(accountSid, authToken);

        // Ensure mobile number is in E.164 format (e.g., +91...)
        const formattedNumber = mobile.startsWith('+') ? mobile : `+91${mobile}`;

        const response = await client.messages.create({
            body: message,
            from: twilioNumber,
            to: formattedNumber
        });

        console.log(`\n--- TWILIO SMS SENT ---`);
        console.log(`SID: ${response.sid}`);
        console.log(`To: ${formattedNumber}`);
        console.log(`------------------------\n`);

        return true;
    } catch (error) {
        console.error('Error sending Twilio SMS:', error.message);
        return false;
    }
};

module.exports = { sendSMS };
