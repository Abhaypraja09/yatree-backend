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
const StaffAttendance = require('../models/StaffAttendance');
const LeaveRequest = require('../models/LeaveRequest');
require('dotenv').config();
// Last Updated: 2026-04-25 12:38 PM - AI Controller Sync

// Clean API Key from ENV (Remove spaces)
const API_KEY = (process.env.GOOGLE_AI_API_KEY || '').trim();
const genAI = new GoogleGenerativeAI(API_KEY);

const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-pro-latest"
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

- FINANCIAL TERMS: When discussing salaries, always distinguish between "Gross Liability" (Total earned by drivers) and "Net Payable" (Actual payout after deducting Advances and Loan EMIs). The dashboard "Monthly Payroll" shows the Net Payable.
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
1. 📊 Current Situation (Include Salary Liability vs Net Payable if asked about money)
2. ⚠️ Problems Detected
3. 💡 Recommendations
4. 📈 Growth Opportunities

Important:
- If asked about salary, provide: Gross Liability, Total Advances, Total EMIs, and Net Payable.
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
            monthlyAllowances,
            monthlyParking
        ] = await Promise.all([
            Vehicle.find({ company: userCompanyId }).lean(),
            User.find({ company: userCompanyId, role: 'Driver' }).lean(),
            Attendance.find({ company: userCompanyId, date: todayStr }).populate('driver').lean(),
            Fuel.find({ company: userCompanyId, status: 'pending' }).populate('vehicle').lean(),
            Parking.find({ company: userCompanyId, status: 'pending' }).populate('driverId').lean(),
            Advance.find({ company: userCompanyId, status: 'pending' }).populate('driver').lean(),
            Attendance.find({ company: userCompanyId, date: { $gte: startOfMonth, $lte: endOfMonth } }).lean(),
            Advance.find({
                company: userCompanyId,
                date: { $gte: istNow.startOf('month').toJSDate(), $lte: istNow.endOf('month').toJSDate() },
                remark: { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ }
            }).lean(),
            Loan.find({ company: userCompanyId, status: 'Active' }).lean(),
            Allowance.find({ company: userCompanyId, date: { $gte: istNow.startOf('month').toJSDate(), $lte: istNow.endOf('month').toJSDate() } }).lean(),
            Parking.find({ company: userCompanyId, date: { $gte: istNow.startOf('month').toJSDate(), $lte: istNow.endOf('month').toJSDate() } }).lean()
        ]);

        // Calculate a robust salary summary matching adminController logic
        const driverSalaries = drivers.filter(d => !d.isFreelancer).map(d => {
            const dId = d._id.toString();
            const atts = monthlyAttendance.filter(a => a.driver?.toString() === dId);
            const advs = monthlyAdvances.filter(a => a.driver?.toString() === dId);
            const loans = monthlyLoans.filter(l => l.driver?.toString() === dId);
            const allowances = monthlyAllowances.filter(al => al.driver?.toString() === dId);

            // Fetch monthly parking for this driver
            const dName = d.name?.trim().toLowerCase();
            const dParking = monthlyParking.filter(p =>
                p.driverId?.toString() === dId ||
                (p.driver?.trim().toLowerCase() === dName && !p.driverId)
            );

            const attendanceDates = new Set();
            let totalWage = 0;
            let totalBonuses = 0;
            let totalOT = 0;

            // Sort to process earlier duties first
            const sortedAtts = [...atts].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

            sortedAtts.forEach(a => {
                // Rule: Wage only ONCE per day (Matching adminController logic)
                if (!attendanceDates.has(a.date)) {
                    attendanceDates.add(a.date);
                    // Use recorded wage. Fallback to profile only if record has no wage field.
                    let dayWage = (a.dailyWage !== undefined && a.dailyWage !== null) ? Number(a.dailyWage) : (Number(d.dailyWage) || 0);
                    totalWage += dayWage;
                }

                // Cumulative Bonuses (SDR, Night Stay, etc.)
                const sameDay = Number(a.punchOut?.allowanceTA) || 0;
                const nightStay = Number(a.punchOut?.nightStayAmount) || 0;
                const special = Number(a.punchOut?.specialPay) || 0;
                const bonus = Math.max(sameDay + nightStay + special, Number(a.outsideTrip?.bonusAmount) || 0);
                totalBonuses += bonus;

                // OT Calculation
                if (d.overtime?.enabled && a.punchIn?.time && a.punchOut?.time) {
                    const hours = (new Date(a.punchOut.time) - new Date(a.punchIn.time)) / 3600000;
                    const otH = Math.max(0, hours - (Number(d.overtime.thresholdHours) || 9));
                    totalOT += Math.round(otH * (Number(d.overtime.ratePerHour) || 0));
                }
            });

            const parkingTotal = dParking.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            const allowanceTotal = allowances.reduce((sum, al) => sum + (Number(al.amount) || 0), 0);

            const totalEarned = totalWage + totalBonuses + totalOT + allowanceTotal + parkingTotal;
            const totalAdvances = advs.reduce((sum, adv) => sum + (Number(adv.amount) || 0), 0);

            // EMI Calculation
            let totalEMI = 0;
            const selM = istNow.month;
            const selY = istNow.year;
            const currentPeriod = istNow.startOf('month');

            loans.forEach(loan => {
                const repayment = (loan.repayments || []).find(r => r.month === selM && r.year === selY);
                if (repayment) {
                    totalEMI += Number(repayment.amount) || 0;
                } else if (loan.status === 'Active' && loan.startDate && loan.remainingAmount > 0) {
                    const loanStart = DateTime.fromJSDate(loan.startDate).setZone('Asia/Kolkata').startOf('month');
                    const monthsDiff = Math.floor(currentPeriod.diff(loanStart, 'months').months + 0.05);
                    const tenure = parseInt(loan.tenureMonths, 10) || (loan.monthlyEMI > 0 ? Math.round(loan.totalAmount / loan.monthlyEMI) : 12);

                    if (monthsDiff >= 0 && monthsDiff < tenure) {
                        totalEMI += Number(loan.monthlyEMI) || 0;
                    }
                }
            });

            return {
                driverId: dId,
                name: d.name,
                totalEarned,
                totalAdvances,
                totalEMI,
                netPayable: totalEarned - totalAdvances - totalEMI
            };
        });

        const totalSalaryLiability = driverSalaries.reduce((sum, d) => sum + d.totalEarned, 0);
        const totalNetPayable = driverSalaries.reduce((sum, d) => sum + d.netPayable, 0);
        const totalAdvancesSum = driverSalaries.reduce((sum, d) => sum + d.totalAdvances, 0);
        const totalEMISum = driverSalaries.reduce((sum, d) => sum + d.totalEMI, 0);

        dataContext.fleetFinance = {
            monthlySalaryLiability: totalSalaryLiability,
            monthlyNetPayable: totalNetPayable,
            monthlyAdvances: totalAdvancesSum,
            monthlyEMIs: totalEMISum
        };

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
            totalSalaryLiability: driverSalaries.reduce((sum, d) => sum + (d.totalEarned || 0), 0),
            totalAdvancesGiven: driverSalaries.reduce((sum, d) => sum + (d.totalAdvances || 0), 0),
            totalLoanEMI: driverSalaries.reduce((sum, d) => sum + (d.totalEMI || 0), 0)
        };

        // --- GENERATE AI RESPONSE ---
        const fullPrompt = `${SYSTEM_PROMPT}\n\nUSER CONTEXT (LIVE DATA):\n${JSON.stringify(dataContext, null, 2)}\n\nUSER QUESTION: "${question}"\n\nRESPONSE:`;

        let responseText = "";
        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(fullPrompt);
                responseText = result.response.text();
                if (responseText) {
                    console.log(`[BOT-SUCCESS] Using model: ${modelName}`);
                    break;
                }
            } catch (err) {
                console.error(`AI Query Error (${modelName}):`, err.message);
            }
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
        console.error("[AI-QUERY-CRITICAL]", error);

        // Simple heuristic fallback
        let fallback = "I'm currently having trouble connecting to my full intelligence engine. ";
        if (question.toLowerCase().includes('salary') || question.toLowerCase().includes('finance')) {
            fallback += `However, I can see your monthly Net Payable is approximately ₹${dataContext?.fleetFinance?.monthlyNetPayable?.toLocaleString() || '0'}.`;
        } else {
            fallback += `I can see you have ${dataContext?.fleetOverview?.totalCars || 'some'} vehicles and ${dataContext?.fleetOverview?.runningCars || 'some'} are active today.`;
        }

        res.json({
            response: fallback + "\n\nPlease try again later for a more detailed analysis.",
            alertsDetected: false
        });
    }
});

// @desc    Enhanced Proactive Briefing (Time-based contextual briefings)
const getAIBriefing = asyncHandler(async (req, res) => {
    let userCompanyId = req.user.company?._id || req.user.company;
    if (typeof userCompanyId === 'string') {
        userCompanyId = new mongoose.Types.ObjectId(userCompanyId);
    }

    const istNow = DateTime.now().setZone('Asia/Kolkata');
    const todayStr = istNow.toFormat('yyyy-MM-dd');
    const yesterdayStr = istNow.minus({ days: 1 }).toFormat('yyyy-MM-dd');
    const hour = istNow.hour;

    console.log(`[AI-BRIEFING] Time: ${istNow.toFormat('HH:mm')}, Hour: ${hour}`);

    const StaffAttendance = require('../models/StaffAttendance');

    const [
        vehicles,
        users,
        todayAttendance,
        yesterdayAttendance,
        todayFuel,
        allPendingRecords,
        todayStaffAttendance
    ] = await Promise.all([
        Vehicle.find({ company: userCompanyId }).lean(),
        User.find({ company: userCompanyId, role: { $in: ['Driver', 'Staff', 'Executive'] } }).lean(),
        Attendance.find({ company: userCompanyId, date: todayStr }).populate('driver').lean(),
        Attendance.find({ company: userCompanyId, date: yesterdayStr }).populate('driver').lean(),
        Fuel.find({ company: userCompanyId, createdAt: { $gte: istNow.startOf('day').toJSDate() } }).lean(),
        Attendance.find({ company: userCompanyId, 'pendingExpenses.status': 'pending' }).lean(),
        StaffAttendance.find({ company: userCompanyId, date: todayStr }).populate('staff').lean()
    ]);

    // Data Preparation
    const drivers = users.filter(u => u.role === 'Driver' && u.status === 'active');
    const internalVehicles = vehicles.filter(v => !v.isOutsideCar);
    const outsideVehicles = vehicles.filter(v => v.isOutsideCar);
    const buySellVehicles = vehicles.filter(v => v.transactionType === 'Buy' || v.transactionType === 'Sell');

    const internalDrivers = drivers.filter(d => !d.isFreelancer);
    const freelancers = drivers.filter(d => d.isFreelancer);

    const staff = users.filter(u => u.role === 'Staff');
    const todayOnDutyStaff = todayStaffAttendance.filter(a => (a.status === 'present' || a.status === 'half-day') && a.staff?.role === 'Staff');

    const todayOnDutyDrivers = todayAttendance.filter(a => a.driver?.role === 'Driver');

    const absentDrivers = internalDrivers.filter(d => !todayAttendance.some(a => a.driver?._id?.toString() === d._id.toString()));
    const absentStaff = staff.filter(s => !todayOnDutyStaff.some(a => a.staff?._id?.toString() === s._id.toString()));

    let slotBriefing = "";

    if (hour >= 9 && hour < 12) {
        // Morning Slot: Attendance
        slotBriefing = `
        MORNING BRIEFING (9AM - 12PM):
        - TOTAL DRIVERS: ${internalDrivers.length} (Internal), ${freelancers.length} (Freelancers).
        - ON DUTY NOW: ${todayOnDutyDrivers.length} Drivers are running.
        - ABSENTEES TODAY: Total ${absentDrivers.length} drivers have NOT punched in yet.
        - STAFF STATUS: ${todayOnDutyStaff.length} staff members punched in out of ${staff.length}.
        - ABSENT STAFF: ${(() => {
                const names = absentStaff
                    .map(s => s.name.trim())
                    .filter(name => !['Xyz', 'Test', 'Ajay1234'].some(test => name.includes(test)));
                const uniqueNames = [...new Set(names)];
                return uniqueNames.length > 0 ? uniqueNames.join(', ') : 'None';
            })()}.
        - DATA SOURCES: Driver Log, Fuel, Staff Attendance.
        `;
    } else if (hour >= 12 && hour < 15) {
        // Mid-day Slot: Fuel & Staff
        const totalFuelAmt = todayFuel.reduce((sum, f) => sum + (f.amount || 0), 0);
        slotBriefing = `
        MID-DAY UPDATE (12PM - 3PM):
        - FUEL STATUS: ${todayFuel.length} cars have been fueled so far today. Total Amount: ₹${totalFuelAmt.toLocaleString()}.
        - STAFF ACTIVITY: ${todayOnDutyStaff.length} staff members logged in.
        - DRIVER ACTIVITY: ${todayOnDutyDrivers.length} drivers currently active on duty.
        `;
    } else if (hour >= 15 && hour < 18) {
        // Afternoon Slot: Yesterday Recap
        const yestFreelancers = freelancers.filter(f => yesterdayAttendance.some(a => a.driver?._id?.toString() === f._id.toString()));
        const yestParking = yesterdayAttendance.reduce((sum, a) => sum + (a.punchOut?.tollParkingAmount || 0), 0);
        const yestFuel = yesterdayAttendance.reduce((sum, a) => sum + (a.fuel?.amount || 0), 0);

        slotBriefing = `
        YESTERDAY'S RECAP (3PM - 6PM):
        - LOGBOOK DATA: Checked data from ${yesterdayStr}.
        - FREELANCERS: ${yestFreelancers.length} freelancers were on duty.
        - EXPENSES: Total Parking ₹${yestParking}, Total Fuel ₹${yestFuel} from logbook.
        - REMARKS: Check logbook for specific driver feedback.
        `;
    } else if (hour >= 18 && hour < 21) {
        // Evening Slot: Outside & Sales
        const recentlySold = buySellVehicles.filter(v => v.transactionType === 'Sell').length;
        const recentlyBought = buySellVehicles.filter(v => v.transactionType === 'Buy').length;

        slotBriefing = `
        EVENING BRIEFING (6PM - 9PM):
        - OUTSIDE FLEET: ${outsideVehicles.length} outside cars are registered in the system.
        - SALES UPDATE: ${recentlySold} vehicles sold, ${recentlyBought} vehicles bought in total.
        - REVENUE: Analyze Sell transactions for profit margins.
        `;
    } else {
        // Night Slot: Staff Recap
        slotBriefing = `
        NIGHT RECAP (9PM - 12AM):
        - STAFF SUMMARY: ${todayOnDutyStaff.length} staff members punched in today. ${(() => {
                const names = absentStaff
                    .map(s => s.name.trim())
                    .filter(name => !['Xyz', 'Test', 'Ajay1234'].some(test => name.includes(test)));
                const uniqueNames = [...new Set(names)];
                return `${uniqueNames.length} staff members were absent (${uniqueNames.join(', ')})`;
            })()}.
        - DRIVER DETAILS: Total ${todayAttendance.length} attendance records processed today.
        - FINAL STATUS: All punch data for drivers and staff is available in the dashboard.
        `;
    }

    const greeting = hour < 12 ? "Good Morning" : (hour < 17 ? "Good Afternoon" : "Good Evening");

    const briefingPrompt = `
        You are the "HAND MATH AI Fleet Assistant". 
        Current Time Context: ${greeting} (${istNow.toFormat('hh:mm a')})

        Instruction: Start your response with "${greeting}".
        Give a PROACTIVE briefing in the SAME language used in the system (Hindi or English).
        
        STRICT RULES:
        - NO NAMES: DO NOT use any names (like Abhay Sahab) in your greetings or responses.
        - CONTEXT: ${slotBriefing}
        - ADDITIONAL: Mention these expiry alerts if urgent: ${JSON.stringify(vehicles.filter(v => v.documentStatuses?.some(d => d.status === 'Expiring Soon')).slice(0, 2).map(v => v.carNumber))}
        
        Keep it very professional, direct and data-focused. (Max 4-5 sentences).
    `;

    try {
        let responseText = "";
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

        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(""), 40000));
        responseText = await Promise.race([aiCall, timeoutPromise]);

        if (!responseText) {
            responseText = `Good ${greeting.split(' ')[1]}. Here is your update: ${slotBriefing}`;
        }

        res.json({ briefing: responseText, alertsDetected: false });

    } catch (error) {
        console.error("AI Briefing Error:", error.message);
        res.json({ briefing: `System is active. ${slotBriefing}` });
    }
});

// @desc    Process Analytical AI Question
const analyzeFleetPerformance = asyncHandler(async (req, res) => {
    const { question } = req.body;
    const userCompanyId = req.user.company?._id || req.user.company;

    console.log(`[AI-ANALYZE] Starting deep analysis for company: ${userCompanyId}`);

    if (!API_KEY) return res.status(503).json({ message: "AI Config Missing." });

    try {
        const istNow = DateTime.now().setZone('Asia/Kolkata');
        const ninetyDaysAgo = istNow.minus({ days: 90 }).toJSDate();
        const startOfMonth = istNow.startOf('month').toJSDate();
        const startOfMonthStr = istNow.startOf('month').toFormat('yyyy-MM-dd');
        const endOfMonthStr = istNow.endOf('month').toFormat('yyyy-MM-dd');

        // --- DEEP ANALYTICAL DATA FETCHING ---
        const [
            vehicles,
            attendanceToday,
            recentFuel,
            recentMaintenance,
            drivers,
            monthlyAttendance,
            allFuel90,
            allMaint90,
            recentAdvances,
            allLoans,
            recentAllowances,
            monthlyParking
        ] = await Promise.all([
            Vehicle.find({ company: userCompanyId, isOutsideCar: { $ne: true } }).lean(),
            Attendance.find({ company: userCompanyId, date: istNow.toFormat('yyyy-MM-dd') }).populate('driver').lean(),
            Fuel.find({ company: userCompanyId, date: { $gte: startOfMonth } }).lean(),
            Maintenance.find({ company: userCompanyId, billDate: { $gte: startOfMonth } }).lean(),
            User.find({ company: userCompanyId, role: 'Driver' }).lean(),
            Attendance.find({ company: userCompanyId, date: { $gte: istNow.startOf('month').toFormat('yyyy-MM-dd') } }).lean(),
            Fuel.find({ company: userCompanyId, date: { $gte: ninetyDaysAgo } }).lean(),
            Maintenance.find({ company: userCompanyId, billDate: { $gte: ninetyDaysAgo } }).lean(),
            Advance.find({ company: userCompanyId, date: { $gte: startOfMonth } }).lean(),
            Loan.find({ company: userCompanyId }).lean(),
            Allowance.find({ company: userCompanyId, date: { $gte: startOfMonth } }).lean(),
            Parking.find({ company: userCompanyId, date: { $gte: startOfMonth } }).lean()
        ]);

        console.log(`[AI-ANALYZE] Data Fetched: ${vehicles.length} vehicles, ${recentFuel.length} fuel records, ${recentMaintenance.length} maintenance records`);

        // --- FILTER MAINTENANCE (Exclude Driver Services like Wash, Cleaning) ---
        const serviceRegex = /wash|washing|cleaning|tissue|water|mask|sanitizer|kapda|puncture/i;
        const filterMaint = (recs) => recs.filter(r => {
            const searchStr = `${r.maintenanceType || ''} ${r.category || ''} ${r.description || ''}`.toLowerCase();
            return !serviceRegex.test(searchStr);
        });

        const filteredRecentMaint = filterMaint(recentMaintenance);
        const filtered90Maint = filterMaint(allMaint90);

        // --- CALCULATE INTERNAL DRIVER SALARY (Match Dashboard Exactly) ---
        const internalDrivers = drivers.filter(d => !d.isFreelancer);
        const internalDriverIds = internalDrivers.map(d => d._id.toString());

        let totalGrossSalary = 0;
        let totalAdvances = 0;
        let totalEMI = 0;

        const currentMonth = istNow.month;
        const currentYear = istNow.year;

        internalDrivers.forEach(driver => {
            const dId = driver._id.toString();
            const driverAtt = monthlyAttendance.filter(a => a.driver?.toString() === dId);
            const dName = driver.name?.trim().toLowerCase();
            const dParking = (monthlyParking || []).filter(p =>
                p.driverId?.toString() === dId ||
                (p.driver?.trim().toLowerCase() === dName && !p.driverId)
            );

            // 1. Gross Salary (Wage + Bonuses + OT + Parking)
            let driverEarned = 0;
            let totalOT = 0;
            const datesProcessed = new Set();
            driverAtt.forEach(att => {
                const dateStr = att.date || 'unknown';
                if (!datesProcessed.has(dateStr)) {
                    driverEarned += (Number(att.dailyWage) || 0);
                    datesProcessed.add(dateStr);
                }
                const nightStay = (Number(att.punchOut?.nightStayAmount) || 0);
                const allowance = (Number(att.punchOut?.allowanceTA) || 0);
                const bonus = (Number(att.outsideTrip?.bonusAmount) || 0);
                driverEarned += Math.max(nightStay + allowance, bonus);

                // OT Calculation
                if (driver.overtime?.enabled && att.punchIn?.time && att.punchOut?.time) {
                    const hours = (new Date(att.punchOut.time) - new Date(att.punchIn.time)) / 3600000;
                    const otH = Math.max(0, hours - (Number(driver.overtime.thresholdHours) || 9));
                    totalOT += Math.round(otH * (Number(driver.overtime.ratePerHour) || 0));
                }
            });

            // Add Special Pay
            const driverAllowances = (recentAllowances || []).filter(a => a.driver?.toString() === dId);
            driverEarned += driverAllowances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

            // Add Monthly Parking
            const parkingTotal = dParking.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            
            driverEarned += totalOT + parkingTotal;
            totalGrossSalary += driverEarned;

            // 2. Advances (Matching dashboard filter)
            const driverAdv = (recentAdvances || []).filter(adv =>
                adv.driver?.toString() === dId &&
                !/Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/i.test(adv.remark || '')
            );
            totalAdvances += driverAdv.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

            // 3. EMI (Strict tenure and start date matching)
            const driverLoans = (allLoans || []).filter(l => l.driver?.toString() === dId);
            const currentPeriod = istNow.startOf('month');
            
            driverLoans.forEach(loan => {
                const repayment = (loan.repayments || []).find(r => r.month === currentMonth && r.year === currentYear);
                if (repayment) {
                    totalEMI += (Number(repayment.amount) || 0);
                } else if (loan.status === 'Active' && loan.startDate && (loan.remainingAmount > 0)) {
                    const loanStart = DateTime.fromJSDate(loan.startDate).setZone('Asia/Kolkata').startOf('month');
                    const monthsDiff = Math.floor(currentPeriod.diff(loanStart, 'months').months + 0.05);
                    const tenure = parseInt(loan.tenureMonths, 10) || (loan.monthlyEMI > 0 ? Math.round(loan.totalAmount / loan.monthlyEMI) : 12);

                    if (monthsDiff >= 0 && monthsDiff < tenure) {
                        totalEMI += (Number(loan.monthlyEMI) || 0);
                    }
                }
            });
        });

        // --- STAFF SALARY CALCULATION (Matched with adminController logic) ---
        const staff = await User.find({ company: userCompanyId, role: 'Staff', status: 'active' }).lean();
        const istToday = istNow.toFormat('yyyy-MM-dd');
        
        let totalStaffGross = 0;

        for (const s of staff) {
            // Determine cycle dates like adminController.js
            const joiningDate = s.joiningDate ? new Date(s.joiningDate) : new Date(s.createdAt);
            const joinDay = DateTime.fromJSDate(joiningDate).setZone('Asia/Kolkata').day;
            
            let cycleStartDT = DateTime.fromObject({ year: istNow.year, month: istNow.month, day: joinDay }, { zone: 'Asia/Kolkata' });
            if (cycleStartDT.month !== istNow.month) cycleStartDT = cycleStartDT.set({ day: 0 });

            if (istNow.day < joinDay) {
                cycleStartDT = cycleStartDT.minus({ months: 1 });
            }
            const cycleEndDT = cycleStartDT.plus({ months: 1 }).minus({ days: 1 });

            const cycleStart = cycleStartDT.toFormat('yyyy-MM-dd');
            const cycleEnd = cycleEndDT.toFormat('yyyy-MM-dd');

            // Fetch data for this specific cycle
            const [myAtt, myLeaves] = await Promise.all([
                StaffAttendance.find({ staff: s._id, date: { $gte: cycleStart, $lte: cycleEnd } }).lean(),
                LeaveRequest.find({ staff: s._id, status: 'Approved', endDate: { $gte: cycleStart } }).lean()
            ]);

            let totalDaysInCycle = 0;
            let presentDays = 0;
            let approvedLeaveDays = 0;
            let paidSundays = 0;

            let d = cycleStartDT;
            while (d <= cycleEndDT) {
                const dStr = d.toFormat('yyyy-MM-dd');
                totalDaysInCycle++;
                
                const isPastOrToday = dStr <= istToday;
                const isSunday = d.weekday === 7;
                const exist = myAtt.find(a => a.date === dStr);
                const onApprovedLeave = myLeaves.some(l => dStr >= l.startDate && dStr <= l.endDate);

                if (exist) {
                    if (exist.status === 'present') presentDays++;
                    else if (exist.status === 'half-day') presentDays += 0.5;
                } else if (onApprovedLeave) {
                    approvedLeaveDays++;
                }

                if (isSunday) {
                    // Sunday pay logic
                    let weekAbsence = false;
                    let checkD = d.minus({ days: 6 });
                    while (checkD < d) {
                        const cStr = checkD.toFormat('yyyy-MM-dd');
                        if (cStr >= cycleStart && cStr <= cycleEnd) {
                            const hasAtt = myAtt.find(a => a.date === cStr);
                            const hasL = myLeaves.some(l => cStr >= l.startDate && cStr <= l.endDate);
                            if (!hasAtt && !hasL && cStr <= istToday) {
                                weekAbsence = true;
                                break;
                            }
                        }
                        checkD = checkD.plus({ days: 1 });
                    }
                    if (!weekAbsence) paidSundays++;
                }

                d = d.plus({ days: 1 });
            }

            const earnedDays = presentDays + approvedLeaveDays + paidSundays;
            const finalSalary = (earnedDays / totalDaysInCycle) * (s.salary || 0);
            totalStaffGross += Math.round(finalSalary);
        }

        // --- OUTSIDE CARS (PARTNER DUTIES) CALCULATION ---
        const outsideCars = await Vehicle.find({
            company: userCompanyId,
            isOutsideCar: true
        }).lean();

        let totalOutsideCarsBuy = 0;
        let totalOutsideCarsSell = 0;
        const currentMonthOutside = outsideCars.filter(v => {
            const datePart = v.carNumber?.split('#')[1];
            return datePart && datePart >= startOfMonthStr && datePart <= endOfMonthStr;
        });

        currentMonthOutside.forEach(v => {
            const amount = Number(v.dutyAmount) || 0;
            if (v.transactionType === 'Sell') {
                totalOutsideCarsSell += amount;
            } else {
                // Default is 'Buy' or 'Duty' (which counts as Buy payout)
                totalOutsideCarsBuy += amount;
            }
        });

        // Calculate specific car efficiency
        const carInsights = vehicles.map(v => {
            const vId = v._id?.toString();
            const vFuel = recentFuel.filter(f => f.vehicle?.toString() === vId);
            const vMaint = filteredRecentMaint.filter(m => m.vehicle?.toString() === vId);
            const vAtt = monthlyAttendance.filter(a => a.vehicle?.toString() === vId);

            return {
                carNumber: v.carNumber,
                model: v.model || 'N/A',
                totalFuel: vFuel.reduce((acc, f) => acc + (Number(f.amount) || 0), 0),
                totalMaintenance: vMaint.reduce((acc, m) => acc + (Number(m.amount) || 0), 0),
                daysRunning: vAtt.length,
                totalKm: vAtt.reduce((acc, a) => acc + (Number(a.totalKM) || 0), 0)
            };
        });

        const insights = {
            fleetSummary: {
                totalOwned: vehicles.length,
                activeToday: attendanceToday.length,
                maintenanceMode: vehicles.filter(v => v.status === 'Maintenance').length
            },
            currentMonthStats: {
                totalFuelSpend: recentFuel.reduce((acc, f) => acc + (Number(f.amount) || 0), 0),
                totalMaintenanceSpend: filteredRecentMaint.reduce((acc, m) => acc + (Number(m.amount) || 0), 0),
                fuelRecordsCount: recentFuel.length,
                maintenanceRecordsCount: filteredRecentMaint.length,
                driverSalarySummary: {
                    grossSalary: totalGrossSalary,
                    totalAdvances: totalAdvances,
                    totalEMI,
                    netPayable: totalGrossSalary - totalAdvances - totalEMI
                },
                staffSalarySummary: {
                    totalGross: totalStaffGross,
                    staffCount: staff.length
                },
                outsideCarsSummary: {
                    totalBuyAmount: totalOutsideCarsBuy,
                    totalSellAmount: totalOutsideCarsSell,
                    outsideCarsCount: currentMonthOutside.length
                }
            },
            history90Days: {
                totalFuelSpend: allFuel90.reduce((acc, f) => acc + (Number(f.amount) || 0), 0),
                totalMaintenanceSpend: filtered90Maint.reduce((acc, m) => acc + (Number(m.amount) || 0), 0)
            },
            topMaintenanceCars: carInsights
                .filter(c => c.totalMaintenance > 0)
                .sort((a, b) => b.totalMaintenance - a.totalMaintenance)
                .slice(0, 3),
            vehicleSummaries: carInsights.map(c => ({
                car: c.carNumber,
                fuel: c.totalFuel,
                maint: c.totalMaintenance,
                km: c.totalKm,
                days: c.daysRunning
            }))
        };

        // Calculate final net payable for summary
        if (insights.currentMonthStats.driverSalarySummary) {
            insights.currentMonthStats.driverSalarySummary.netPayable =
                insights.currentMonthStats.driverSalarySummary.grossSalary -
                insights.currentMonthStats.driverSalarySummary.totalAdvances -
                insights.currentMonthStats.driverSalarySummary.totalEMI;
        }

        const finalPrompt = `You are the "HAND MATH AI Fleet Assistant". 
        Based on this fleet data: ${JSON.stringify(insights)}
        
        Task: Answer the user's specific question: "${question}"
        
        STRICT RULES:
        1. Be very concise and direct.
        2. Distinguish between DRIVER salary (driverSalarySummary) and STAFF salary (staffSalarySummary).
        3. If the user asks for "Staff salary", use the staffSalarySummary value (Total Gross).
        4. If the user asks for "Driver salary" or just "Salary" in fleet context, use driverSalarySummary.
        5. If the user asks for "Outside Cars", "Partner Duties", or "BUY/SELL", use outsideCarsSummary.
        6. If "BUY" is asked, use totalBuyAmount. If "SELL" is asked, use totalSellAmount.
        7. ONLY answer what is asked. Do not provide a long business report unless the user asks for "report" or "analysis".
        8. Use professional and helpful tone.
        9. Use the same language (Hindi/English) as the user's question.`;

        let responseText = "";
        for (const modelName of modelsToTry) {
            try {
                console.log(`[AI-ANALYZE] Trying model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(finalPrompt);
                responseText = result.response.text();
                if (responseText) {
                    console.log(`[AI-ANALYZE-SUCCESS] Found working model: ${modelName}`);
                    break;
                }
            } catch (err) {
                console.error(`[AI-ANALYZE-FAIL] ${modelName}:`, err.message);
            }
        }

        if (!responseText) {
            console.log("[AI-ANALYZE-TIMEOUT] Falling back to local analysis.");

            const carDetails = insights.topMaintenanceCars.map(c =>
                `- ${c.carNumber} (${c.model}): ₹${c.totalMaintenance.toLocaleString()} (Maint), ${c.daysRunning} days active`
            ).join('\n');

            const salary = insights.currentMonthStats.driverSalarySummary;
            const salaryDetails = salary ? `
**Driver Payroll Summary:**
- Total Gross Salary: ₹${salary.grossSalary.toLocaleString()}
- Total Advances: ₹${salary.totalAdvances.toLocaleString()}
- Monthly EMI: ₹${salary.totalEMI.toLocaleString()}
- **Net Payable: ₹${salary.netPayable.toLocaleString()}**` : '';

            const specificCarQuery = question.match(/\d{4}/);
            let carInfo = '';
            if (specificCarQuery) {
                const foundCar = insights.vehicleSummaries.find(s => s.car.includes(specificCarQuery[0]));
                if (foundCar) {
                    carInfo = `\n**Specific Insight for ${foundCar.car}:**\n- April Fuel: ₹${foundCar.fuel.toLocaleString()}\n- April Maintenance: ₹${foundCar.maint.toLocaleString()}\n- Distance: ${foundCar.km} KM over ${foundCar.days} active days.`;
                }
            }

            responseText = `📊 **Fleet Performance Report (Local Engine)**
            
I am currently in basic analysis mode. Here is the summary for the **Current Month**:
${carInfo}

**Fleet Summary:**
- Total Vehicles: ${insights.fleetSummary.totalOwned}
- Active Today: ${insights.fleetSummary.activeToday}
- In Maintenance: ${insights.fleetSummary.maintenanceMode}

**Current Month Stats:**
- Total Fuel Spend: ₹${insights.currentMonthStats.totalFuelSpend.toLocaleString()} (${insights.currentMonthStats.fuelRecordsCount} records)
- Total Maintenance Spend: ₹${insights.currentMonthStats.totalMaintenanceSpend.toLocaleString()} (${insights.currentMonthStats.maintenanceRecordsCount} records)
${salaryDetails}

**90 Day History Summary:**
- Total Fuel: ₹${insights.history90Days.totalFuelSpend.toLocaleString()}
- Total Maintenance: ₹${insights.history90Days.totalMaintenanceSpend.toLocaleString()}

**Top Maintenance Vehicles:**
${carDetails || 'No significant maintenance records found.'}

**Recommendations:**
- Ensure all fuel slips are approved to maintain accurate reporting.
- Check vehicles with high maintenance costs for potential replacement.

*Note: Deep AI insights are temporarily unavailable, using local data processor.*`;
        }

        res.json({ response: responseText, alertsDetected: true });

    } catch (error) {
        console.error("[AI-ANALYZE-CRITICAL]", error);
        res.json({
            response: `⚠️ **Analysis System Alert**

I encountered a problem with my deep analysis engine. However, I can still see your fleet data:

- **Fleet Overview**: ${insights?.fleetSummary?.totalOwned || '...'} total vehicles, ${insights?.fleetSummary?.activeToday || '...'} running today.
- **Financial Status**: You've spent ₹${insights?.currentMonthStats?.totalFuelSpend?.toLocaleString() || '...'} on fuel and ₹${insights?.currentMonthStats?.totalMaintenanceSpend?.toLocaleString() || '...'} on maintenance this month.

**Top Issue**: ${insights?.topMaintenanceCars?.[0]?.carNumber ? `Vehicle ${insights.topMaintenanceCars[0].carNumber} has the highest maintenance cost (₹${insights.topMaintenanceCars[0].totalMaintenance.toLocaleString()}).` : 'No critical anomalies detected.'}

Please try again in a few minutes while I restore the full AI service.`,
            alertsDetected: false
        });
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
