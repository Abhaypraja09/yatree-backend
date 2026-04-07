require('dotenv').config();

async function listModels() {
    const API_KEY = process.env.GOOGLE_AI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    
    console.log(`Listing available models...`);
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.models) {
            console.log("AVAILABLE MODELS:");
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("❌ Failed to list models:", JSON.stringify(data));
        }
    } catch (err) {
        console.error("💥 Error:", err.message);
    }
}

listModels();
