
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const API_KEY = (process.env.GOOGLE_AI_API_KEY || '').trim();
const genAI = new GoogleGenerativeAI(API_KEY);

async function testPrefix() {
    try {
        console.log("Testing with models/ prefix...");
        const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
        const result = await model.generateContent("Hi");
        console.log("✅ Prefix SUCCESS:", result.response.text());
    } catch (e) {
        console.log("❌ Prefix FAILED:", e.message);
    }
}
testPrefix();
