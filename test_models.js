require('dotenv').config();

async function testModel(modelName) {
    const API_KEY = process.env.GOOGLE_AI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${API_KEY}`;
    
    console.log(`Testing ${modelName}...`);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Say hello" }] }]
            })
        });
        const data = await response.json();
        if (data.candidates) {
            console.log(`✅ ${modelName} works! Response: ${data.candidates[0].content.parts[0].text}`);
            return true;
        } else {
            console.log(`❌ ${modelName} failed:`, JSON.stringify(data));
            return false;
        }
    } catch (err) {
        console.error(`💥 ${modelName} error:`, err.message);
        return false;
    }
}

async function runTests() {
    console.log("Starting diagnostics...");
    await testModel('gemini-1.5-flash');
    await testModel('gemini-1.5-pro');
}

runTests();
