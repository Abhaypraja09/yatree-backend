require('dotenv').config();
const axios = require('axios');

async function listAll() {
    const key = (process.env.GOOGLE_AI_API_KEY || '').trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    
    try {
        console.log("Fetching allowed models list from Google API...");
        const response = await axios.get(url);
        if (response.data && response.data.models) {
            console.log("Allowed Models Found:");
            response.data.models.forEach(m => {
                console.log(`- ${m.name} (Methods: ${m.supportedGenerationMethods.join(', ')})`);
            });
        } else {
            console.log("No models found in response:", response.data);
        }
    } catch (e) {
        console.error("API Call Failed Status:", e.response ? e.response.status : 'No Status');
        console.error("API Call Error Details:", e.response ? e.response.data : e.message);
    }
}
listAll();
