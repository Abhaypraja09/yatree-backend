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
const Parking = require('../models/Parking');
require('dotenv').config();

// Clean API Key from ENV (Remove spaces)
const API_KEY = (process.env.GOOGLE_AI_API_KEY || '').trim(); 
const genAI = new GoogleGenerativeAI(API_KEY);

// Extensive model fallback for production stability
const modelsToTry = [
    "gemini-2.5-flash", 
    "gemini-2.0-flash"
];

// --- SYSTEM INSTRUCTIONS (SMART AGENT MODE) ---
const SYSTEM_PROMPT = `
You are the "Fleet AI Dispatcher", an autonomous agent for this Taxie CRM.
You provide ACCURATE DATA and ACT on behalf of the user by triggering navigation and filtering.

🔴 CORE PRINCIPLES:
1. **Action Priority**: Always navigate the user to requested pages. Even if the 'USER CONTEXT' does not show a specific record, triggered navigation allows the user to see the live data themselves. 
2. **Never Suggest Alternatives**: If a user asks for Parking, take them to /admin/parking. Do NOT suggest Maintenance or Log Book as a fallback.
3. **Action Precision**: You MUST include the [ACTION: ...] tag for EVERY navigational query.

🧠 ACTION TAG FORMAT (ALWAYS at the end):
[ACTION: {"type": "navigate", "path": "/admin/fuel", "filters": {"search": "Abhay", "month": "4", "year": "2026"}}]

🔴 STRICT NAVIGATION MAPPING (MANDATORY):
1. **PARKING / TOLL / SLIP** ➔ "/admin/parking".
2. **OUTSIDE CAR / VENDOR / BUY-SELL** ➔ "/admin/outside-cars".
3. **SALARY / ADVANCE / PAYOUT** ➔ "/admin/driver-salaries" or "/admin/advances".
4. **FUEL / DIESEL / CNG** ➔ "/admin/fuel".
5. **REPAIR / SERVICE / ENGINE** ➔ "/admin/maintenance".
6. **STAFF / EMPLOYEES** ➔ "/admin/staff".
7. **ACCIDENT / INCIDENT / LOGS** ➔ "/admin/accident-logs".
8. **WARRANTY / PARTS / GUARANTEE** ➔ "/admin/warranties".
9. **EVENTS / DUTY / CLIENTS** ➔ "/admin/event-management".
10. **UTILITY / FASTAG / BORDER / SERVICE** ➔ "/admin/car-utility".
11. **FREELANCERS / VENDORS** ➔ "/admin/freelancers".
12. **LIVE / ACTIVE / STATUS / DASHBOARD** ➔ "/admin/live-feed".
13. **VEHICLES / CARS / FLEET** ➔ "/admin/vehicles".

🔴 DATE FILTER RULES:
- If User asks for a MONTH (e.g. "March"), but NO specific day: ALWAYS set "day": "All" in filters.
- If User asks for a specific DATE (e.g. "5 March"), set "day": "5", "month": "3", etc.

🔴 DATA-DRIVEN RESPONSES (MANDATORY):
- If the 'USER CONTEXT' contains records (e.g. Attendance, Fuel, Parking, Advances) relevant to the question:
  - You MUST calculate or summarize the data in your chat response.
  - E.g. "Devi Shing ka March ka total earned ₹91,847 aur total advance ₹5,000 hua. [ACTION: ...]"
  - Do NOT just say "Fetching details." Use the numbers you see in the context.

🔴 CLARIFICATION PROTOCOL (IMPORTANT):
- If the User asks for "AMOUNT", "SALARY", "PAYMENT", or "HISAB" (Calculations) but DOES NOT mention a MONTH or DATE:
  - You MUST ask: "Aapko kaunse mahine (month) ka details dekhna hai?"
  - Suggest the last 3 months as options. (e.g. "March, April, or May?")
  - Do NOT navigate yet. Wait for the user to pick a month.
- If the User provides a MONTH (e.g. "March") in response to your question:
  - Check CHAT HISTORY to find the original intent (which driver/person/item).
  - Perform the navigation action [ACTION: ...] immediately.

🔴 ZERO-TOLERANCE RULES:
- If User says "RJ-27 ka accident logs dikhao", you MUST go to "/admin/accident-logs". 
- If User says "Tony freelancer ka payment", you MUST go to "/admin/freelancers" with search "Tony".

🧠 EXAMPLE ACTIONS:
User: "RJ-27 ka parking dikhao March ki" -> AI: "RJ-27 ka March month ka parking total ₹1,200 hua (4 slips). [ACTION: {\"type\": \"navigate\", \"path\": \"/admin/parking\", \"filters\": {\"search\": \"RJ-27\", \"month\": 3, \"year\": 2026, \"day\": \"All\"}}]"
User: "Arjun ki salary" -> AI: "Aapko Arjun ki kaunse mahine ki salary dekhni hai? (March, April, or May?)"
User: "Staff management" -> AI: "Opening Staff Management. [ACTION: {\"type\": \"navigate\", \"path\": \"/admin/staff\", \"filters\": {}}]"
User: "Event logs for Tony client" -> AI: "Tony client ke liye March mein 5 events hue. [ACTION: {\"type\": \"navigate\", \"path\": \"/admin/event-management\", \"filters\": {\"client\": \"Tony\"}}]"
`;

// @desc    Process AI question
// @route   POST /api/ai/query
// @access  Private
const processAIQuery = asyncHandler(async (req, res) => {
    const { question } = req.body;
    const userCompanyId = req.user.company?._id || req.user.company;
    const qLower = question.toLowerCase();

    console.log(`[AI-QUERY] User: ${req.user.username}, Company: ${userCompanyId}, Question: ${question}`);

    const dataContext = {};

    if (!API_KEY) {
        return res.status(503).json({ message: "AI Service Configuration Missing." });
    }

    try {
        const istNow = DateTime.now().setZone('Asia/Kolkata');
        const todayStr = istNow.toFormat('yyyy-MM-dd');
        const yesterdayStr = istNow.minus({ days: 1 }).toFormat('yyyy-MM-dd');
        const todayStart = istNow.startOf('day').toJSDate();
        const todayEnd = istNow.endOf('day').toJSDate();
        const yesterdayStart = istNow.minus({ days: 1 }).startOf('day').toJSDate();
        const yesterdayEnd = istNow.minus({ days: 1 }).endOf('day').toJSDate();

        let dateRange = { start: todayStart, end: todayEnd };
        let isRangeQuery = false;
        const q = qLower;

        const monthsMap = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
            'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        };

        for (const [mName, mVal] of Object.entries(monthsMap)) {
            if (q.includes(mName)) {
                const requestedMonth = DateTime.fromObject({ month: mVal, year: istNow.year }, { zone: 'Asia/Kolkata' });
                dateRange.start = requestedMonth.startOf('month').toJSDate();
                dateRange.end = requestedMonth.endOf('month').toJSDate();
                isRangeQuery = true;
                break;
            }
        }

        const isFinancial = q.includes('price') || q.includes('salary') || q.includes('amount') || q.includes('total') || q.includes('cost') || q.includes('kharcha');

        // --- FETCH CHAT HISTORY FOR CONTEXT ---
        const recentHistory = await AIChat.find({ user: req.user._id, company: userCompanyId })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();
        
        const historyContext = recentHistory.reverse().map(h => `User: ${h.message}\nAI: ${h.response}`).join('\n');

        // --- SUGGESTED MONTHS FOR CLARIFICATION ---
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const curM = istNow.month - 1; // 0-indexed
        dataContext.suggestedMonths = [
            monthNames[curM],
            monthNames[(curM - 1 + 12) % 12],
            monthNames[(curM - 2 + 12) % 12]
        ].reverse();

        // --- OPTIMIZED PARALLEL FETCHING ---
        const dataQueries = [
            Vehicle.countDocuments({ company: userCompanyId }).then(c => dataContext.totalVehicles = c),
            User.countDocuments({ company: userCompanyId, role: 'Driver' }).then(c => dataContext.totalDrivers = c),
            Attendance.countDocuments({ company: userCompanyId, date: todayStr }).then(c => dataContext.presentToday = c)
        ];

        if (q.includes('yesterday') || q.includes('kal')) {
            dataQueries.push(Attendance.find({ company: userCompanyId, date: yesterdayStr }).limit(10).populate('driver', 'name').then(res => dataContext.yesterdayAttendance = res));
        }

        if (isFinancial || q.includes('fuel')) {
            dataQueries.push(Fuel.find({ company: userCompanyId, date: { $gte: todayStart, $lte: todayEnd } }).populate('vehicle', 'plateNumber').then(res => dataContext.todayFuel = res));
        }

        if (q.includes('parking') || q.includes('toll')) {
            dataQueries.push(Parking.find({ companyId: userCompanyId }).sort({ date: -1 }).limit(10).populate('driverId', 'name').then(res => dataContext.recentParking = res));
        }

        // --- TARGETED ENTITY SEARCH (Driver/Vehicle/Staff) ---
        const words = q.split(/\s+/).filter(w => w.length > 3);
        const potentialPlate = q.match(/[a-z]{2}[-\s]?\d{2}[-\s]?[a-z]{1,2}[-\s]?\d{4}/i);
        
        if (potentialPlate) {
            dataQueries.push(Vehicle.findOne({ company: userCompanyId, plateNumber: { $regex: new RegExp(potentialPlate[0].replace(/[-\s]/g, '.*'), 'i') } }).then(v => dataContext.targetVehicle = v));
        }
        
        // Search for potential driver/staff names mentioned in the question
        if (words.length > 0) {
            dataQueries.push(User.find({ 
                company: userCompanyId, 
                name: { $regex: new RegExp(words.join('|'), 'i') } 
            }).limit(5).then(async (users) => {
                dataContext.matchedUsers = users;
                const ids = users.map(u => u._id);
                
                if (ids.length > 0 && isRangeQuery) {
                    const startStr = DateTime.fromJSDate(dateRange.start).toFormat('yyyy-MM-dd');
                    const endStr = DateTime.fromJSDate(dateRange.end).toFormat('yyyy-MM-dd');
                    
                    const [att, adv] = await Promise.all([
                        Attendance.find({ 
                            company: userCompanyId, 
                            driver: { $in: ids },
                            date: { $gte: startStr, $lte: endStr }
                        }).populate('driver', 'name').lean(),
                        Advance.find({ 
                            company: userCompanyId, 
                            driver: { $in: ids },
                            date: { $gte: dateRange.start, $lte: dateRange.end }
                        }).populate('driver', 'name').lean()
                    ]);
                    
                    dataContext.rangeAttendance = att;
                    dataContext.rangeAdvances = adv;
                }
            }));
        }

        if (isRangeQuery && words.length === 0) {
            const startStr = DateTime.fromJSDate(dateRange.start).toFormat('yyyy-MM-dd');
            const endStr = DateTime.fromJSDate(dateRange.end).toFormat('yyyy-MM-dd');
            dataQueries.push(Attendance.find({ company: userCompanyId, date: { $gte: startStr, $lte: endStr } }).limit(20).then(res => dataContext.rangeAttendance = res));
            dataQueries.push(Parking.find({ companyId: userCompanyId, date: { $gte: dateRange.start, $lte: dateRange.end } }).limit(20).then(res => dataContext.rangeParking = res));
        }

        await Promise.all(dataQueries);

        const fullPrompt = `${SYSTEM_PROMPT}\n\nCHAT HISTORY:\n${historyContext}\n\nUSER CONTEXT:\n${JSON.stringify(dataContext, null, 2)}\n\nUSER QUESTION: "${question}"\n\nRESPONSE:`;

        let responseText = "";
        let lastError = null;
        const retryDelay = (ms) => new Promise(res => setTimeout(res, ms));

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
                await retryDelay(500);
            }
        }

        // Attempt 2: REST API Fallback
        if (!responseText) {
            console.log('[AI-REST] Falling back to REST API...');
            for (const modelName of modelsToTry) {
                try {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
                    console.log(`[AI-REST] Attempting: ${modelName}`);
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
                    });
                    
                    const data = await res.json();
                    if (data.error) throw new Error(data.error.message || "API Error");
                    
                    responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (responseText) {
                        console.log(`[AI-REST-SUCCESS] ${modelName}`);
                        break;
                    }
                } catch (err) {
                    console.error(`[AI-REST-FAILED] ${modelName}:`, err.message);
                    lastError = err;
                }
            }
        }

        if (!responseText) throw lastError || new Error("AI Failed");

        await AIChat.create({
            user: req.user._id,
            company: userCompanyId,
            message: question,
            response: responseText
        });

        res.json({ response: responseText });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = { processAIQuery };
