
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const API_KEY = (process.env.GOOGLE_AI_API_KEY || '').trim();
const genAI = new GoogleGenerativeAI(API_KEY);

const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-002",
    "gemini-1.5-pro",
    "gemini-1.5-pro-002"
];

async function testModels() {
    console.log("Testing API Key:", API_KEY ? "Present (Starts with " + API_KEY.substring(0, 5) + "...)" : "MISSING");
    
    for (const modelName of modelsToTry) {
        try {
            console.log(`Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello, are you working?");
            console.log(`SUCCESS [${modelName}]:`, result.response.text().substring(0, 50));
        } catch (err) {
            console.error(`FAIL [${modelName}]:`, err.message);
        }
    }
}

testModels();
