
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const API_KEY = (process.env.GOOGLE_AI_API_KEY || '').trim();
const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
    try {
        console.log("Listing models...");
        // The SDK might not have a direct listModels, but we can try fetching one that usually exists
        // Or check documentation. For @google/generative-ai, it's often better to just try common names.
        // Let's try 'gemini-pro' (older alias) or 'gemini-1.0-pro'
        const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro'];
        for(const m of models) {
             try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("test");
                console.log(`SUCCESS: ${m}`);
                break;
             } catch(e) {
                console.log(`FAILED: ${m} - ${e.message}`);
             }
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

listModels();
