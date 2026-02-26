const axios = require('axios');
const path = require('path');
const fs = require('fs');

async function test() {
    try {
        const companyId = '67bc5ec8686d63c5095d10d6'; // Example company ID from previous work
        const apiUrl = `http://localhost:5005/api/admin/dashboard/${companyId}?date=2026-02-26`;

        // We need a token. I'll just look at the logs or try to get one.
        // Actually, I'll just check if the backend is running.
        const res = await axios.get(apiUrl); // Might fail due to auth, but I want to see JSON structure if possible.
        console.log(JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.log('Error (expected if no auth):', err.message);
    }
}
test();
