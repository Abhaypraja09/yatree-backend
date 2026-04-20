require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testV1() {
    const key = (process.env.GOOGLE_AI_API_KEY || '').trim();
    console.log("Testing with API Version: v1");
    try {
        const genAI = new GoogleGenerativeAI(key, { apiVersion: 'v1' });
        // gemini-1.5-flash should be in v1
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hi");
        console.log("Success with v1 and gemini-1.5-flash:", result.response.text());
    } catch (e) {
        console.error("Failure with v1:", e.message);
        
        console.log("\nAttempting with v1beta but different model name...");
        try {
            const genAIbeta = new GoogleGenerativeAI(key);
            const model = genAIbeta.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
            const result = await model.generateContent("Hi");
            console.log("Success with v1beta and gemini-1.5-flash-latest:", result.response.text());
        } catch (e2) {
            console.error("Failure with v1beta latest:", e2.message);
        }
    }
}
testV1();
