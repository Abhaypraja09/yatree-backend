
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const API_KEY = (process.env.GOOGLE_AI_API_KEY || '').trim();
const genAI = new GoogleGenerativeAI(API_KEY);

async function checkModels() {
    console.log("Checking available models...");
    // Some versions of the SDK might have a different way, but let's try common ones again
    // including the very latest ones.
    const models = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro",
        "gemini-1.5-pro-latest",
        "gemini-pro"
    ];
    
    for (const m of models) {
        try {
            console.log(`Trying ${m}...`);
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("Say 'System OK'");
            console.log(`✅ ${m} is WORKING!`);
            console.log("Response:", result.response.text());
            return;
        } catch (err) {
            console.log(`❌ ${m} FAILED: ${err.message}`);
        }
    }
    console.log("All common models failed.");
}

checkModels();
