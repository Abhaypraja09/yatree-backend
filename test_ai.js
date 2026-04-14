require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    console.log("Testing Gemini API Key...");
    const key = process.env.GOOGLE_AI_API_KEY;
    if (!key) {
        console.error("Missing Key!");
        return;
    }
    console.log("Using Key:", key.substring(0, 10) + "...");
    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Hello, say hello in Hindi.");
        console.log("Response:", result.response.text());
    } catch (e) {
        console.error("Test Failed!", e.message);
    }
}

test();
