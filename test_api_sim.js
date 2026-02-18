const axios = require('axios');

async function testApi() {
    try {
        // Since I can't easily get a token here, I'll just check the controller logic directly again
        // But wait, I can use the native driver to see if the query matches exactly what's in the DB
        console.log('Testing the logic with the exact query from controller...');
    } catch (e) {
        console.error(e);
    }
}
testApi();
