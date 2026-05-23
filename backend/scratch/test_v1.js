
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const API_KEY = (process.env.GOOGLE_AI_API_KEY || '').trim();
const genAI = new GoogleGenerativeAI(API_KEY);

async function testV1() {
    try {
        console.log("Testing with v1 API...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });
        const result = await model.generateContent("Hi");
        console.log("✅ v1 SUCCESS:", result.response.text());
    } catch (e) {
        console.log("❌ v1 FAILED:", e.message);
    }
}
testV1();
