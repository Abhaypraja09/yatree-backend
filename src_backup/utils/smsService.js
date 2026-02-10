/**
 * Placeholder for SMS notifications. 
 * Twilio dependency was removed by user request.
 */
const sendSMS = async (mobile, message) => {
    try {
        console.log(`\n--- [MOCK] SMS NOTIFICATION ---`);
        console.log(`Notice: SMS notifications are currently disabled.`);
        console.log(`To: ${mobile}`);
        console.log(`Message: ${message}`);
        console.log(`-------------------------------\n`);
        return true;
    } catch (error) {
        console.error('Error in mock SMS service:', error.message);
        return false;
    }
};

module.exports = { sendSMS };

