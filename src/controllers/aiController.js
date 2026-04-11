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

// Fallback models for stability
const modelsToTry = [
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest"
];

// --- SYSTEM INSTRUCTIONS (THE FLEET COMMANDER PERSONA) ---
const SYSTEM_PROMPT = `
You are the "Fleet Executive Advisor" for Abhay, the company owner. 
You don't just answer; you ADVISE, REMIND, and ANALYZE like a senior manager.

🔴 YOUR CORE RESPONSIBILITIES:
1. **Approval Vigilance**: Check if there are receipts (Parking/Fuel) that Abhay hasn't approved yet. If found, REMIND him politely: "Aapne X driver ki fuel parchi abhi tak approve nahi ki hai."
2. **Proactive Insights**: If you see a driver driving very low KM, try to explain why based on the context (e.g. Maintenance, Weekend, No duty).
3. **Data Interpretation**: Don't just show numbers. Tell him WHAT they mean. (e.g. "Aaj fuel ka kharcha control mein hai" or "Aaj expenses thode bypass ho rahe hain").
4. **Action Navigation**: Always provide navigation actions using the [ACTION: ...] tag.

🔴 COMMUNICATION STYLE:
- Language: Professional Hinglish (Hindi + English).
- Tone: Vigilant, loyal, and proactive.
- Approach: If the user doesn't ask, tell them "Aaj ka khaas update ye hai..."

🧠 ACTION TAG FORMAT:
[ACTION: {"type": "navigate", "path": "/admin/fuel", "filters": {"search": "Abhay", "month": "4", "year": "2026"}}]
`;

// @desc    Process AI question with Proactive Approval Reminders
const processAIQuery = asyncHandler(async (req, res) => {
    const { question } = req.body;
    const userCompanyId = req.user.company?._id || req.user.company;
    const qLower = question.toLowerCase();

    const dataContext = {};

    if (!API_KEY) return res.status(503).json({ message: "AI Config Missing." });

    try {
        const istNow = DateTime.now().setZone('Asia/Kolkata');
        const todayStr = istNow.toFormat('yyyy-MM-dd');

        // --- DEEP DATA FETCHING ---
        const [vehicles, drivers, attendanceToday, pendingFuel, pendingParking, pendingAdvances] = await Promise.all([
            Vehicle.find({ company: userCompanyId }).lean(),
            User.find({ company: userCompanyId, role: 'Driver' }).lean(),
            Attendance.find({ company: userCompanyId, date: todayStr }).populate('driver').lean(),
            Fuel.find({ company: userCompanyId, status: 'pending' }).populate('vehicle').lean(),
            Parking.find({ companyId: userCompanyId, status: 'pending' }).populate('driverId').lean(),
            Advance.find({ company: userCompanyId, status: 'pending' }).populate('driver').lean()
        ]);

        // Add "Pending Tasks" to context to trigger AI reminders
        dataContext.adminPendingTasks = {
            unapprovedFuelBills: pendingFuel.length,
            unapprovedParkingSlips: pendingParking.length,
            pendingAdvanceRequests: pendingAdvances.length,
            details: {
                fuel: pendingFuel.map(f => `${f.vehicle?.plateNumber} (₹${f.amount})`).join(', '),
                parking: pendingParking.map(p => `${p.driverId?.name} (₹${p.amount})`).join(', ')
            }
        };

        dataContext.fleetOverview = {
            totalCars: vehicles.length,
            runningCars: vehicles.filter(v => v.status === 'Running').length,
            maintenanceCars: vehicles.filter(v => v.status === 'Maintenance').length,
            driversOnDuty: attendanceToday.length
        };

        // --- GENERATE AI RESPONSE ---
        const fullPrompt = `${SYSTEM_PROMPT}\n\nUSER CONTEXT (LIVE DATA):\n${JSON.stringify(dataContext, null, 2)}\n\nUSER QUESTION: "${question}"\n\nRESPONSE:`;

        let responseText = "";
        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(fullPrompt);
                responseText = result.response.text();
                if (responseText) break;
            } catch (err) { console.error(`Retry fail: ${modelName}`); }
        }

        if (!responseText) throw new Error("AI busy.");

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

// @desc    Enhanced Proactive Briefing (Daily Status + Approval Warnings)
const getAIBriefing = asyncHandler(async (req, res) => {
    const userCompanyId = req.user.company?._id || req.user.company;
    const istNow = DateTime.now().setZone('Asia/Kolkata');
    const todayStr = istNow.toFormat('yyyy-MM-dd');

    const [vehicles, attToday, allPendingRecords] = await Promise.all([
        Vehicle.find({ company: userCompanyId }).lean(),
        Attendance.find({ company: userCompanyId, date: todayStr }).lean(),
        Attendance.find({
            company: userCompanyId,
            'pendingExpenses.status': 'pending'
        }).lean()
    ]);

    console.log(`[AI-Briefing] Company: ${userCompanyId}, AllPendingRecords: ${allPendingRecords.length}`);

    // Flatten all pending expenses for counting
    let pendingFuelCount = 0;
    let pendingParkingCount = 0;
    
    allPendingRecords.forEach(att => {
        (att.pendingExpenses || []).forEach(exp => {
            if (exp.status === 'pending') {
                if (exp.type === 'fuel') pendingFuelCount++;
                if (exp.type === 'parking') pendingParkingCount++;
            }
        });
    });

    const totalPending = pendingFuelCount + pendingParkingCount;
    // Count running cars as drivers with incomplete attendance shifts today
    const activeCount = attToday.filter(a => a.status === 'incomplete').length;

    console.log(`[AI-Briefing] Calculated: Fuel=${pendingFuelCount}, Parking=${pendingParkingCount}, RunningCars=${activeCount}`);

    const hour = istNow.hour;
    const greeting = hour < 12 ? "Good Morning" : (hour < 17 ? "Good Afternoon" : "Good Evening");

    const briefingPrompt = `
        You are the "Fleet Commander Assistant". 
        Give a PROACTIVE briefing to Abhay Sahab in Hinglish.
        Analyze the numbers:
        - Active Cars: ${activeCount} of ${vehicles.length}
        - Drivers on Duty: ${attToday.length}
        - PENDING APPROVALS: ${pendingFuelCount} fuel and ${pendingParkingCount} parking slips (${totalPending} total).
        
        🔴 LOGIC RULE: 
        - If PENDING APPROVALS are 0, do NOT mention them. Just say "All records are updated".
        - If PENDING APPROVALS are > 0, REMIND Abhay strongly that he needs to check them.
        
        Keep it concise (Max 4 sentences) in Hinglish.
    `;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(briefingPrompt);
        res.json({ briefing: result.response.text() });
    } catch (error) {
        const totalPending = pendingFuel.length + pendingParking.length;
        const msg = totalPending > 0
            ? `${greeting}! Status: ${activeCount} active cars, ${attToday.length} drivers on duty. Kripya ${totalPending} pending slips check karein.`
            : `${greeting}! Sab theek hai. ${activeCount} active cars aur ${attToday.length} drivers on duty. All records updated!`;
        res.json({ briefing: msg });
    }
});

module.exports = { processAIQuery, getAIBriefing };
