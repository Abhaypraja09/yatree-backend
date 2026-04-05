const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const API_KEY = (process.env.GOOGLE_AI_API_KEY || '').trim();
const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
    console.log('--- CHECKING AVAILABLE MODELS ---');
    console.log('Using API Key (last 4 chars):', API_KEY.slice(-4));
    
    try {
        // We use the raw fetch method to list models to bypass SDK limitations
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();
        
        if (data.models) {
            console.log('\n✅ AVAILABLE MODELS FOR YOUR KEY:');
            data.models.forEach(m => {
                console.log(`- ${m.name} (Supports: ${m.supportedGenerationMethods.join(', ')})`);
            });
        } else {
            console.log('\n❌ NO MODELS FOUND. Response:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('\n❌ ERROR CONTACTING GOOGLE API:', error.message);
    }
}

listModels();
