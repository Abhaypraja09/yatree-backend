const mongoose = require('mongoose');
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
const Loan = require('../models/Loan');
const Allowance = require('../models/Allowance');
require('dotenv').config();

// Clean API Key from ENV (Remove spaces)
const API_KEY = (process.env.GOOGLE_AI_API_KEY || '').trim();
const genAI = new GoogleGenerativeAI(API_KEY);

// Use fewer, faster models to prevent 30s timeout
const modelsToTry = [
    "gemini-flash-latest",
    "gemini-1.5-flash-latest"
];

// --- FALLBACK LOGIC FOR GOOGLE API FAILURE ---
function generateLocalFallback(data, queryType = 'briefing') {
    // Handle both nested and flat structures
    const vehicles = data.fleetOverview?.totalVehicles || data.totalVehicles || 0;
    const active = data.fleetOverview?.activeVehicles || data.activeVehicles || 0;
    const pendingFuel = data.adminPendingTasks?.fuelPendingCount || data.fuelPending || 0;
    const pendingParking = data.adminPendingTasks?.parkingPendingCount || data.parkingPending || 0;
    const alerts = data.expiryAlerts || data.alerts || [];

    const hour = new Date().getHours() + 5; 
    const greeting = hour < 12 ? "Good Morning" : (hour < 17 ? "Good Afternoon" : "Good Evening");

    if (queryType === 'briefing') {
        let alertText = alerts.length > 0 
            ? `⚠️ Attention: ${alerts.length} expiries detected (like ${alerts[0].carNumber} ${alerts[0].type}).`
            : "No urgent alerts detected in own fleet.";

        return `${greeting}.
📊 Status Update:
- Fleet Size: ${vehicles} Owned Vehicles
- Active Today: ${active} Running
- Approvals: ${pendingFuel + pendingParking} pending records.
${alertText}`;
    }

    return `${greeting}. I am in basic mode. Current Info: ${active}/${vehicles} vehicles running. Alerts status: ${alerts.length} active.`;
}



// --- SYSTEM INSTRUCTIONS (HAND MATH AI FLEET ASSISTANT) ---
const SYSTEM_PROMPT = `
You are an AI Fleet Management Assistant for a Taxi Fleet CRM system called "HAND MATH".

STRICT RULES:
- GREETING: Use time-based greetings like "Good Morning", "Good Afternoon", or "Good Evening" depending on the current time.
- NO NAMES: DO NOT use any names (like Abhay Sahab, etc.) in your greetings or responses.
- LANGUAGE MATCH: Respond in the SAME language as the user's query. If the user asks in Hindi, respond in Hindi. If the user asks in English, respond in English.
- DATA ONLY: Use ONLY the provided real-time data for the internal fleet.
- OWNED FLEET ONLY: Do NOT count "Outside Cars" or "Event Cars" as part of the company's own fleet. Only focus on internal vehicles for expiry and costs.

- NO ASSUMPTIONS: Do NOT guess or generate fake numbers. If data is missing, say "Data not available".
- Keep responses short, clear, and business-focused. Avoid long explanations.

FINAL INSTRUCTION:
Accuracy is more important than creativity. Act like a direct business control assistant.
`;



function buildSmartPrompt(insights, userQuery) {
  return `
You are an Expert Fleet Management AI Consultant.

Your job:
- Analyze fleet performance
- Detect problems
- Find cost leaks
- Suggest actionable improvements

Strict Rules:
- Do NOT give generic answers
- Always use numbers and data
- Be concise but insightful
- Answer like a business consultant

User Question:
"${userQuery}"

Fleet Insights Data:
${JSON.stringify(insights, null, 2)}

Response Format:
1. 📊 Current Situation (short summary)
2. ⚠️ Problems Detected
3. 💡 Recommendations
4. 📈 Growth Opportunities

Important:
- If data is missing, say "insufficient data"
- Highlight anomalies (high cost, low usage, idle vehicles)
- Compare performance wherever possible
`;
}


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

        const startOfMonth = istNow.startOf('month').toFormat('yyyy-MM-dd');
        const endOfMonth = istNow.endOf('month').toFormat('yyyy-MM-dd');

        // --- DEEP DATA FETCHING ---
        const [
            vehicles, 
            drivers, 
            attendanceToday, 
            pendingFuel, 
            pendingParking, 
            pendingAdvances,
            monthlyAttendance,
            monthlyAdvances,
            monthlyLoans,
            monthlyAllowances
        ] = await Promise.all([
            Vehicle.find({ company: userCompanyId }).lean(),
            User.find({ company: userCompanyId, role: 'Driver' }).lean(),
            Attendance.find({ company: userCompanyId, date: todayStr }).populate('driver').lean(),
            Fuel.find({ company: userCompanyId, status: 'pending' }).populate('vehicle').lean(),
            Parking.find({ companyId: userCompanyId, status: 'pending' }).populate('driverId').lean(),
            Advance.find({ company: userCompanyId, status: 'pending' }).populate('driver').lean(),
            Attendance.find({ company: userCompanyId, date: { $gte: startOfMonth, $lte: endOfMonth } }).lean(),
            Advance.find({ 
                company: userCompanyId, 
                date: { $gte: istNow.startOf('month').toJSDate(), $lte: istNow.endOf('month').toJSDate() } 
            }).lean(),
            Loan.find({ company: userCompanyId, status: 'Active' }).lean(),
            Allowance.find({ company: userCompanyId, date: { $gte: istNow.startOf('month').toJSDate(), $lte: istNow.endOf('month').toJSDate() } }).lean()
        ]);

        // Calculate a robust salary summary matching adminController logic
        const driverSalaries = drivers.filter(d => !d.isFreelancer).map(d => {
            const dId = d._id.toString();
            const atts = monthlyAttendance.filter(a => a.driver?.toString() === dId);
            const advs = monthlyAdvances.filter(a => a.driver?.toString() === dId);
            const loans = monthlyLoans.filter(l => l.driver?.toString() === dId);
            const allowances = monthlyAllowances.filter(al => al.driver?.toString() === dId);
            
            const attendanceDates = new Set();
            let totalWage = 0;
            let totalBonuses = 0;
            let totalOT = 0;

            // Sort to process earlier duties first
            const sortedAtts = [...atts].sort((a,b) => (a.date||'').localeCompare(b.date||''));

            sortedAtts.forEach(a => {
                // Rule: Wage only ONCE per day
                if (!attendanceDates.has(a.date)) {
                    attendanceDates.add(a.date);
                    let dayWage = Number(a.dailyWage) || Number(d.dailyWage) || 0;
                    if (!dayWage && d.salary) {
                        dayWage = Math.round(Number(d.salary) / 26);
                    }
                    totalWage += dayWage;
                }

                // Cumulative Bonuses
                const sameDay = Number(a.punchOut?.allowanceTA) || 0;
                const nightStay = Number(a.punchOut?.nightStayAmount) || 0;
                const special = Number(a.punchOut?.specialPay) || 0;
                totalBonuses += (sameDay + nightStay + special + (Number(a.outsideTrip?.bonusAmount) || 0));

                // OT Calculation
                if (d.overtime?.enabled && a.punchIn?.time && a.punchOut?.time) {
                    const hours = (new Date(a.punchOut.time) - new Date(a.punchIn.time)) / 3600000;
                    const otH = Math.max(0, hours - (Number(d.overtime.thresholdHours) || 9));
                    totalOT += Math.round(otH * (Number(d.overtime.ratePerHour) || 0));
                }
            });

            const totalEarned = totalWage + totalBonuses + totalOT + allowances.reduce((s, al) => s + (Number(al.amount) || 0), 0);
            const totalAdvance = advs.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
            const totalEMI = loans.reduce((sum, l) => sum + (Number(l.monthlyEMI) || 0), 0);
            
            return {
                name: d.name,
                earnedThisMonth: totalEarned,
                advanceTaken: totalAdvance,
                loanEMI: totalEMI,
                balanceDue: totalEarned - totalAdvance - totalEMI
            };
        });

        // Add "Pending Tasks" to context to trigger AI reminders
        dataContext.adminPendingTasks = {
            unapprovedFuelBills: pendingFuel.length,
            unapprovedParkingSlips: pendingParking.length,
            pendingAdvanceRequests: pendingAdvances.length,
            details: {
                fuel: pendingFuel.map(f => `${f.vehicle?.carNumber || 'N/A'} (₹${f.amount})`).join(', '),
                parking: pendingParking.map(p => `${p.driverId?.name} (₹${p.amount})`).join(', ')
            }
        };

        dataContext.fleetOverview = {
            totalCars: vehicles.length,
            runningCars: attendanceToday.filter(a => a.status === 'incomplete').length,
            maintenanceCars: vehicles.filter(v => v.status === 'Maintenance').length,
            driversOnDuty: attendanceToday.length
        };

        dataContext.financials = {
            currentMonthDriverSalaries: driverSalaries,
            totalSalaryLiability: driverSalaries.reduce((sum, d) => sum + d.earnedThisMonth, 0),
            totalAdvancesGiven: driverSalaries.reduce((sum, d) => sum + d.advanceTaken, 0),
            totalLoanEMI: driverSalaries.reduce((sum, d) => sum + d.loanEMI, 0)
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
            } catch (err) { console.error(`AI Query Error (${modelName}):`, err.message); }
        }

        if (!responseText) throw new Error("AI busy.");

        await AIChat.create({
            user: req.user._id,
            company: userCompanyId,
            message: question,
            response: responseText
        });

        const alertsDetected = /puc|insurance|fitness|expiry|expire|overdue/i.test(responseText);
        res.json({ response: responseText, alertsDetected });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Enhanced Proactive Briefing (Daily Status + Approval Warnings)
const getAIBriefing = asyncHandler(async (req, res) => {
    let userCompanyId = req.user.company?._id || req.user.company;
    if (typeof userCompanyId === 'string') {
        userCompanyId = new mongoose.Types.ObjectId(userCompanyId);
    }
    
    const istNow = DateTime.now().setZone('Asia/Kolkata');
    const todayStr = istNow.toFormat('yyyy-MM-dd');

    console.log(`[AI-DEBUG] Starting Briefing for User: ${req.user.name}, Company: ${userCompanyId}, Date: ${todayStr}`);

    const [vehicles, todayIncompleteAttendance, allPendingRecords] = await Promise.all([
        Vehicle.find({ company: userCompanyId, isOutsideCar: { $ne: true } }).lean(),
        Attendance.find({ 
            company: userCompanyId, 
            status: 'incomplete',
            date: todayStr
        }).lean(),
        Attendance.find({
            company: userCompanyId,
            'pendingExpenses.status': 'pending'
        }).lean()
    ]);


    console.log(`[AI-DEBUG] Raw Counts - Vehicles: ${vehicles.length}, TodayActive: ${todayIncompleteAttendance.length}, RecordsWithPending: ${allPendingRecords.length}`);

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

    // Calculate alerts (Insurance, FITNESS, PUC, etc.)
    const expiryAlerts = [];
    const fourteenDaysFromNow = DateTime.now().plus({ days: 14 });

    vehicles.forEach(v => {
        if (v.insuranceExpiry && DateTime.fromJSDate(v.insuranceExpiry) < fourteenDaysFromNow) {
            expiryAlerts.push({ carNumber: v.carNumber, type: 'INSURANCE', date: v.insuranceExpiry });
        }
        if (v.fitnessExpiry && DateTime.fromJSDate(v.fitnessExpiry) < fourteenDaysFromNow) {
            expiryAlerts.push({ carNumber: v.carNumber, type: 'FITNESS', date: v.fitnessExpiry });
        }
        if (v.documents && Array.isArray(v.documents)) {
            v.documents.forEach(doc => {
                const docDate = doc.expiryDate ? new Date(doc.expiryDate) : null;
                const expDate = docDate ? DateTime.fromJSDate(docDate) : null;
                if (expDate && expDate < fourteenDaysFromNow) {
                    expiryAlerts.push({ carNumber: v.carNumber, type: doc.documentType || 'DOC', date: doc.expiryDate });
                }
            });
        }
    });

    const totalPending = pendingFuelCount + pendingParkingCount;
    // Count running cars as today's incomplete attendance only for consistency with Live Feed
    const activeCount = todayIncompleteAttendance.length;

    console.log(`[AI-DEBUG] Final Stats - RunningCars: ${activeCount}, FuelPending: ${pendingFuelCount}, ParkingPending: ${pendingParkingCount}, Alerts: ${expiryAlerts.length}`);


    const hour = istNow.hour;
    const greeting = hour < 12 ? "Good Morning" : (hour < 17 ? "Good Afternoon" : "Good Evening");

    const briefingPrompt = `
        You are the "HAND MATH AI Fleet Assistant". 
        Current Time Context: ${greeting} (${istNow.toFormat('hh:mm a')})

        Instruction: Start your response with "${greeting}".
        Give a PROACTIVE briefing in the SAME language used in the system (Hindi or English).
        
        STRICT RULES:
        - NO NAMES: DO NOT use any names (like Abhay Sahab) in your greetings or responses.
        - GREETING: Use time-based greetings (Good Morning/Afternoon/Evening) depending on the time of day.
        - DATA: Analyze these numbers for the INTERNAL FLEET ONLY:
            - Active (Running) Cars: ${activeCount}
            - Total Internal Vehicles: ${vehicles.length}
            - PENDING APPROVALS: ${pendingFuelCount} fuel and ${pendingParkingCount} parking slips (${totalPending} total).
            - EXPIRY ALERTS: ${JSON.stringify(expiryAlerts.slice(0, 3))}
        
        🔴 LOGIC RULE: 
        - If PENDING APPROVALS are 0, do NOT mention approvals. Just say "All records are updated".
        - If PENDING APPROVALS are > 0, REMIND the manager to check them.
        - ALWAYS mention detected expiry alerts (if any) clearly.

        
        Keep it very concise (Max 3-4 sentences).
    `;


    try {
        let responseText = "";
        
        // --- ADDED 15s TIMEOUT TO PREVENT AXIOS TIMEOUT ---
        const aiCall = (async () => {
            for (const modelName of modelsToTry) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(briefingPrompt);
                    return result.response.text();
                } catch (err) { console.error(`Briefing Error (${modelName}):`, err.message); }
            }
            return "";
        })();

        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(""), 15000));
        
        responseText = await Promise.race([aiCall, timeoutPromise]);

        if (!responseText) {
            console.log("[AI-TIMEOUT] Falling back to local briefing.");
            responseText = generateLocalFallback({ 
                totalVehicles: vehicles.length, 
                activeVehicles: activeCount, 
                fuelPending: pendingFuelCount, 
                parkingPending: pendingParkingCount,
                alerts: expiryAlerts 
            }, 'briefing');
        }

        
        const alertsDetected = (expiryAlerts && expiryAlerts.length > 0) || /puc|insurance|fitness|expiry|expire|overdue/i.test(responseText);
        res.json({ briefing: responseText, alertsDetected });

    } catch (error) {
        console.error("AI Briefing Error:", error.message);
        res.json({ 
            briefing: `${greeting}! Sab theek lag raha hai, lekin ${totalPending} slips approval ke liye pending hain. Kripya check karein.` 
        });
    }
});

// @desc    Process Analytical AI Question
const analyzeFleetPerformance = asyncHandler(async (req, res) => {
    const { question } = req.body;
    const userCompanyId = req.user.company?._id || req.user.company;

    if (!API_KEY) return res.status(503).json({ message: "AI Config Missing." });

    try {
        const istNow = DateTime.now().setZone('Asia/Kolkata');
        const startOfMonth = istNow.startOf('month').toJSDate();

        // --- DEEP ANALYTICAL DATA FETCHING (Owned Fleet Only) ---
        const [vehicles, attendanceToday, monthlyFuel, monthlyMaintenance] = await Promise.all([
            Vehicle.find({ company: userCompanyId, isOutsideCar: { $ne: true } }).lean(),
            Attendance.find({ company: userCompanyId, date: istNow.toFormat('yyyy-MM-dd') }).populate('driver').lean(),
            Fuel.find({ company: userCompanyId, date: { $gte: startOfMonth } }).lean(),
            Maintenance.find({ company: userCompanyId, billDate: { $gte: startOfMonth } }).lean()
        ]);


        const insights = {
            fleetComposition: {
                totalVehicles: vehicles.length,
                running: vehicles.filter(v => v.status === 'Running').length,
                underMaintenance: vehicles.filter(v => v.status === 'Maintenance').length,
                idle: vehicles.length - attendanceToday.length
            },
            operationalEfficiency: {
                activeDutiesToday: attendanceToday.length,
                avgKmPerDuty: attendanceToday.length > 0 
                    ? attendanceToday.reduce((acc, a) => acc + (a.totalKm || 0), 0) / attendanceToday.length 
                    : 0
            },
            costBasics: {
                monthlyFuelSpend: monthlyFuel.reduce((acc, f) => acc + (f.amount || 0), 0),
                monthlyMaintenanceSpend: monthlyMaintenance.reduce((acc, m) => acc + (m.amount || 0), 0),
                avgFuelRate: monthlyFuel.length > 0 
                    ? monthlyFuel.reduce((acc, f) => acc + (f.pricePerLitre || 0), 0) / monthlyFuel.length 
                    : 0
            },
            anomalies: {
                lowUtilizationVehicles: vehicles.filter(v => !attendanceToday.some(a => a.vehicle?.toString() === v._id.toString())).map(v => v.carNumber),
                excessiveMaintenance: monthlyMaintenance.filter(m => m.amount > 10000).map(m => ({ car: m.carNumber, amount: m.amount }))
            }
        };

        const finalPrompt = buildSmartPrompt(insights, question);

        let responseText = "";
        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(finalPrompt);
                responseText = result.response.text();
                if (responseText) break;
            } catch (err) { console.error(`Analysis Error (${modelName}):`, err.message); }
        }

        if (!responseText) throw new Error("AI analysis unavailable.");

        const alertsDetected = /low usage|maintenance|anomaly|attention|alert|expiry/i.test(responseText);
        res.json({ response: responseText, alertsDetected });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const checkAlerts = asyncHandler(async (req, res) => {
    const userCompanyId = req.user.company?._id || req.user.company;
    const fourteenDaysFromNow = DateTime.now().plus({ days: 14 });

    const vehicles = await Vehicle.find({ company: userCompanyId, isOutsideCar: { $ne: true } }).lean();
    
    let alertsList = [];
    for (const v of vehicles) {
        if (v.insuranceExpiry && DateTime.fromJSDate(v.insuranceExpiry) < fourteenDaysFromNow) {
            alertsList.push({ carNumber: v.carNumber, type: 'INSURANCE', date: v.insuranceExpiry });
        }
        if (v.fitnessExpiry && DateTime.fromJSDate(v.fitnessExpiry) < fourteenDaysFromNow) {
            alertsList.push({ carNumber: v.carNumber, type: 'FITNESS', date: v.fitnessExpiry });
        }
        if (v.documents && Array.isArray(v.documents)) {
            v.documents.forEach(doc => {
                const docDate = doc.expiryDate ? new Date(doc.expiryDate) : null;
                const expDate = docDate ? DateTime.fromJSDate(docDate) : null;
                if (expDate && expDate < fourteenDaysFromNow) {
                    alertsList.push({ carNumber: v.carNumber, type: doc.documentType || 'DOC', date: doc.expiryDate });
                }
            });
        }
    }
    // Sort by date (most urgent first) and take top 3
    alertsList.sort((a, b) => new Date(a.date) - new Date(b.date));
    const top3Alerts = alertsList.slice(0, 3);

    res.json({ alertsDetected: top3Alerts.length > 0, alerts: top3Alerts });
});

module.exports = { processAIQuery, getAIBriefing, analyzeFleetPerformance, checkAlerts };
