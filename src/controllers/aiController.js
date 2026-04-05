const { GoogleGenerativeAI } = require('@google/generative-ai');
const asyncHandler = require('express-async-handler');
const Vehicle = require('../models/Vehicle');
const Maintenance = require('../models/Maintenance');
const User = require('../models/User');
const Advance = require('../models/Advance');
const Company = require('../models/Company');
const Fuel = require('../models/Fuel');
const AIChat = require('../models/AIChat');
const Attendance = require('../models/Attendance');
require('dotenv').config();

// Clean API Key from ENV (Remove spaces)
const API_KEY = (process.env.GOOGLE_AI_API_KEY || '').trim(); 
const genAI = new GoogleGenerativeAI(API_KEY);

// Resilient model selection with automatic fallback
const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro", "gemini-1.0-pro"];


// --- SYSTEM INSTRUCTIONS (STRICT DATA INTERFACE MODE) ---
const SYSTEM_PROMPT = `
You are an advanced Fleet Management AI Assistant. Your role is NOT to guess and NOT to use pre-trained knowledge.
Your ONLY job is to act as a DATA INTERFACE between the user and the database.

🔴 STRICT RULES:
- DO NOT generate fake data. DO NOT assume values.
- ALWAYS rely on the database results provided in the 'USER CONTEXT'.
- If data is missing or "status: false", clearly say "Data not available" or "Data not found".
- Accuracy > Smartness. Real Data > Generated Answer.

🧠 STEP 1: INTENT DETECTION
Internally convert user query into JSON (intent, date, action).
Example: { "intent": "fuel_expense", "date": "yesterday", "action": "sum" }

🧠 STEP 2: WAIT FOR CONTEXT
Analyze the 'USER CONTEXT' provided below.

🧠 STEP 3: FINAL RESPONSE
Generate a direct, human-friendly response based ONLY on the context data.
- TOTAL DRIVER SALARY: Calculate by summing (dailyWage + punchOut.allowanceTA + punchOut.nightStayAmount + punchOut.specialPay) for the filtered date.
- FUEL/MAINTENANCE: Sum the 'amount' fields for the matched period.

LANGUAGE SUPPORT: Hindi, Hinglish, English.
`;

// @desc    Process AI question
// @route   POST /api/ai/query
// @access  Private
const processAIQuery = asyncHandler(async (req, res) => {
    const { question } = req.body;
    const userCompanyId = req.user.company?._id || req.user.company;
    const qLower = question.toLowerCase();

    console.log(`[AI-QUERY] User: ${req.user.username}, Company: ${userCompanyId}, Question: ${question}`);

    const dataContext = {
        requestedDateData: [],
        todayAttendance: [],
        stats: {},
        recentMaintenance: [],
        recentFuel: [],
        fleet: [],
        drivers: []
    };

    if (!API_KEY) {
        console.error('[AI-ERROR] Missing GOOGLE_AI_API_KEY in .env');
        return res.status(503).json({ 
            message: "AI Service Configuration Missing. Please add 'GOOGLE_AI_API_KEY' in the backend .env file." 
        });
    }

    try {
        // --- DATA FETCHING (Keep as is) ---
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        dataContext.stats = {
            totalVehicles: await Vehicle.countDocuments({ company: userCompanyId }),
            totalDrivers: await User.countDocuments({ company: userCompanyId, role: 'Driver' }),
        };

        const q = qLower;
        const isFinancial = q.includes('price') || q.includes('amount') || q.includes('kharcha') || q.includes('total') || q.includes('pisa') || q.includes('pise') || q.includes('cost');
        const todayStart = new Date(today); todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(today); todayEnd.setHours(23,59,59,999);
        const yesterdayStart = new Date(yesterday); yesterdayStart.setHours(0,0,0,0);
        const yesterdayEnd = new Date(yesterday); yesterdayEnd.setHours(23,59,59,999);

        if (q.includes('kal') || q.includes('yesterday')) {
            dataContext.yesterdayAttendance = await Attendance.find({ company: userCompanyId, date: yesterdayStr }).populate('driver').populate('vehicle');
            dataContext.yesterdayFuel = await Fuel.find({ company: userCompanyId, date: { $gte: yesterdayStart, $lte: yesterdayEnd } }).populate('vehicle');
            dataContext.yesterdayMaintenance = await Maintenance.find({ company: userCompanyId, date: { $gte: yesterdayStart, $lte: yesterdayEnd } }).populate('vehicle');
        }

        if (q.includes('duty') || q.includes('attendance') || q.includes('aaye hai') || q.includes('present') || q.includes('ajj') || q.includes('today')) {
             dataContext.todayAttendance = await Attendance.find({ company: userCompanyId, date: todayStr }).populate('driver').populate('vehicle');
             dataContext.todayFuel = await Fuel.find({ company: userCompanyId, date: { $gte: todayStart, $lte: todayEnd } }).populate('vehicle');
        }

        if (isFinancial || q.includes('salary') || q.includes('paisa') || q.includes('pay') || q.includes('कमाई')) {
            dataContext.financialContext = {
                attendance: await Attendance.find({ company: userCompanyId, date: { $in: [todayStr, yesterdayStr] } }),
                todayFuel: await Fuel.find({ company: userCompanyId, date: { $gte: todayStart, $lte: todayEnd } }),
                yesterdayFuel: await Fuel.find({ company: userCompanyId, date: { $gte: yesterdayStart, $lte: yesterdayEnd } })
            };
        }

        if (q.includes('maintenance') || q.includes('repair') || q.includes('service')) {
            dataContext.recentMaintenance = await Maintenance.find({ company: userCompanyId }).sort({ date: -1 }).limit(100).populate('vehicle');
        }

        if (q.includes('fuel') || q.includes(' diesel')) {
            dataContext.recentFuel = await Fuel.find({ company: userCompanyId }).sort({ date: -1 }).limit(100).populate('vehicle');
        }

        if (q.includes('gadi') || q.includes('car') || q.includes('tony') || q.includes('owner')) {
            dataContext.fleet = await Vehicle.find({ company: userCompanyId }).select('plateNumber model ownerName dutyAmount isOutsideCar');
        }

        const fullPrompt = `${SYSTEM_PROMPT}\n\nUSER CONTEXT:\n${JSON.stringify(dataContext, null, 2)}\n\nUSER QUESTION: "${question}"\n\nRESPONSE:`;

        // --- ROBUST MODEL FALLBACK ---
        const modelsToTry = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];
        let lastError = null;
        let responseText = "";

        for (const modelName of modelsToTry) {
            try {
                console.log(`[AI-TRY] Attempting with model: ${modelName}`);
                const dynamicModel = genAI.getGenerativeModel({ model: modelName });
                const result = await dynamicModel.generateContent(fullPrompt);
                responseText = result.response.text();
                if (responseText) break; // Success!
            } catch (err) {
                console.error(`[AI-TRY-FAILED] Model ${modelName}:`, err.message);
                lastError = err;
            }
        }

        if (!responseText) throw lastError || new Error("Failed to generate response with any model");

        // Save and Respond
        await AIChat.create({
            user: req.user._id,
            company: userCompanyId,
            message: question,
            response: responseText,
            contextUsed: dataContext
        });

        res.json({ response: responseText });
    } catch (error) {
        console.error('[AI-ERROR] Detailed Failure:', error.message);
        const status = (error.status === 429 || error.message?.includes('429')) ? 429 : 500;
        res.status(status).json({ message: `AI Service Error: ${error.message}` });
    }
});

module.exports = { processAIQuery };
