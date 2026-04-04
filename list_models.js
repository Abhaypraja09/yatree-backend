require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    console.log("Listing Available Models...");
    const key = process.env.GOOGLE_AI_API_KEY;
    if (!key) {
        console.error("Missing Key!");
        return;
    }
    try {
        const genAI = new GoogleGenerativeAI(key);
        // SDK VERSION dependent
        // Trying direct fetch to be sure
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await resp.json();
        if (data.models) {
             data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
             console.log("No models returned:", data);
        }
    } catch (e) {
        console.error("List Models Failed!", e.message);
    }
}

listModels();
