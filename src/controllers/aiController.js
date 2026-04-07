const { GoogleGenerativeAI } = require('@google/generative-ai');
const asyncHandler = require('express-async-handler');
const { DateTime } = require('luxon');
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

// Extensive model fallback for production stability
const modelsToTry = [
    "gemini-2.0-flash", 
    "gemini-1.5-flash", 
    "gemini-1.5-flash-latest", 
    "gemini-1.5-pro", 
    "gemini-pro", 
    "gemini-1.0-pro"
];


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
        // --- ROBUST DATE LOGIC (IST via LUXON) ---
        const istNow = DateTime.now().setZone('Asia/Kolkata');
        const todayStr = istNow.toFormat('yyyy-MM-dd');
        const yesterdayStr = istNow.minus({ days: 1 }).toFormat('yyyy-MM-dd');

        const todayStart = istNow.startOf('day').toJSDate();
        const todayEnd = istNow.endOf('day').toJSDate();
        const yesterdayStart = istNow.minus({ days: 1 }).startOf('day').toJSDate();
        const yesterdayEnd = istNow.minus({ days: 1 }).endOf('day').toJSDate();

        console.log(`[AI-DEBUG] Today (IST): ${todayStr}, TodayRange: ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);

        dataContext.stats = {
            totalVehicles: await Vehicle.countDocuments({ company: userCompanyId }),
            totalDrivers: await User.countDocuments({ company: userCompanyId, role: 'Driver' }),
            presentDriversToday: await Attendance.countDocuments({ company: userCompanyId, date: todayStr })
        };

        const q = qLower;
        // Optimization: "total" shouldn't always trigger financial. Added specific keywords.
        const isFinancial = q.includes('price') || q.includes('kharcha') || q.includes('salary') || q.includes('budget') || q.includes('payment') || q.includes('कमाई') || q.includes('how much') || q.includes('kitna') || q.includes('amount') || q.includes('total') || q.includes('cost');

        if (q.includes('kal') || q.includes('yesterday')) {
            dataContext.yesterdayAttendance = await Attendance.find({ company: userCompanyId, date: yesterdayStr }).populate('driver', 'name mobile').populate('vehicle', 'plateNumber');
            dataContext.yesterdayFuel = await Fuel.find({ company: userCompanyId, date: { $gte: yesterdayStart, $lte: yesterdayEnd } }).populate('vehicle', 'plateNumber');
        }

        if (q.includes('duty') || q.includes('attendance') || q.includes('aaye hai') || q.includes('present') || q.includes('ajj') || q.includes('today') || q.includes('driver')) {
             const att = await Attendance.find({ company: userCompanyId, date: todayStr }).populate('driver', 'name mobile').populate('vehicle', 'plateNumber');
             dataContext.todayAttendance = att;
             dataContext.presentDriverNames = att.map(a => a.driver?.name).filter(Boolean);
        }

        if (isFinancial || q.includes('fuel') || q.includes('diesel') || q.includes('petrol') || q.includes('cng')) {
            dataContext.financialContext = {
                todayAttendance: await Attendance.find({ company: userCompanyId, date: todayStr }).populate('driver', 'name mobile').populate('vehicle', 'plateNumber'),
                yesterdayAttendance: await Attendance.find({ company: userCompanyId, date: yesterdayStr }).populate('driver', 'name mobile').populate('vehicle', 'plateNumber'),
                todayFuel: await Fuel.find({ company: userCompanyId, date: { $gte: todayStart, $lte: todayEnd } }).populate('vehicle', 'plateNumber'),
                yesterdayFuel: await Fuel.find({ company: userCompanyId, date: { $gte: yesterdayStart, $lte: yesterdayEnd } }).populate('vehicle', 'plateNumber')
            };
        }

        if (q.includes('maintenance') || q.includes('repair') || q.includes('service')) {
            dataContext.recentMaintenance = await Maintenance.find({ company: userCompanyId }).sort({ date: -1 }).limit(30).populate('vehicle', 'plateNumber');
        }

        if (q.includes('fuel') || q.includes('diesel') || q.includes('petrol') || q.includes('cng')) {
            dataContext.recentFuel = await Fuel.find({ company: userCompanyId }).sort({ date: -1 }).limit(30).populate('vehicle', 'plateNumber');
            // Also ensure today's reported fuel (potentially pending) is included
            const attToday = await Attendance.find({ company: userCompanyId, date: todayStr }).populate('driver', 'name').populate('vehicle', 'plateNumber');
            dataContext.todayReportedFuel = attToday.map(a => ({
                driver: a.driver?.name,
                vehicle: a.vehicle?.plateNumber,
                amountFilled: a.fuel?.amount || 0,
                details: a.fuel?.entries?.map(e => `${e.fuelType || 'Diesel'}: ₹${e.amount}`).join(', '),
                pendingExpenses: (a.pendingExpenses || [])
                    .filter(e => e.type === 'fuel')
                    .map(e => `${e.fuelType || 'Diesel'}: ₹${e.amount} (${e.status})`)
                    .join(', ')
            })).filter(r => r.amountFilled > 0 || r.pendingExpenses.length > 0);
        }

        if (q.includes('gadi') || q.includes('car') || q.includes('vehic') || q.includes('plate') || q.includes('owner')) {
            dataContext.fleet = await Vehicle.find({ company: userCompanyId }).select('plateNumber model ownerName dutyAmount isOutsideCar');
        }

        if (q.includes('driver') || q.includes('naam') || q.includes('name') || q.includes('list') || q.includes('kaun') || q.includes('who')) {
            dataContext.drivers = await User.find({ company: userCompanyId, role: 'Driver' }).select('name mobile status -_id');
        }

        const fullPrompt = `${SYSTEM_PROMPT}\n\nUSER CONTEXT:\n${JSON.stringify(dataContext, null, 2)}\n\nUSER QUESTION: "${question}"\n\nRESPONSE:`;

        // --- ROBUST MODEL FALLBACK (SDK + REST API) ---
        const modelsToTry = [
            "gemini-2.5-flash",
            "gemini-3.1-flash-live-preview",
            "gemini-2.0-flash",
            "gemini-1.5-flash", 
            "gemini-pro"
        ];
        let lastError = null;
        let responseText = "";

        // Attempt 1: Using Official SDK
        for (const modelName of modelsToTry) {
            try {
                console.log(`[AI-SDK] Attempting: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(fullPrompt);
                responseText = result.response.text();
                if (responseText) {
                    console.log(`[AI-SUCCESS] via SDK: ${modelName}`);
                    break;
                }
            } catch (err) {
                console.error(`[AI-SDK-FAILED] ${modelName}:`, err.message);
                lastError = err;
            }
        }

        // Attempt 2: REST API Fallback (Bypass SDK version issues)
        if (!responseText) {
            console.log('[AI-REST] Trying Direct REST API Fallback...');
            for (const modelName of modelsToTry) {
                try {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: fullPrompt }] }]
                        })
                    });
                    const data = await response.json();
                    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                        responseText = data.candidates[0].content.parts[0].text;
                        console.log(`[AI-SUCCESS] via REST API: ${modelName}`);
                        break;
                    }
                } catch (restErr) {
                    console.error(`[AI-REST-FAILED] ${modelName}:`, restErr.message);
                    lastError = restErr;
                }
            }
        }

        if (!responseText) throw lastError || new Error("All AI connection methods failed");

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
