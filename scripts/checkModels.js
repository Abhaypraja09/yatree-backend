const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.GOOGLE_AI_API_KEY;

async function listModels() {
    try {
        console.log("Checking v1 endpoint...");
        const resV1 = await axios.get(`https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`);
        console.log("--- V1 MODELS ---");
        resV1.data.models.forEach(m => {
            if (m.supportedGenerationMethods.includes('generateContent')) {
                console.log(m.name);
            }
        });
    } catch (err) {
        console.log("V1 failed:", err.response?.data?.error?.message || err.message);
    }

    try {
        console.log("\nChecking v1beta endpoint...");
        const resBeta = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        console.log("--- V1BETA MODELS ---");
        resBeta.data.models.forEach(m => {
            if (m.supportedGenerationMethods.includes('generateContent')) {
                console.log(m.name);
            }
        });
    } catch (err) {
        console.log("V1Beta failed:", err.response?.data?.error?.message || err.message);
    }
}

listModels();
