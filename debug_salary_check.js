const mongoose = require('mongoose');
const User = require('./src/models/User');
const Attendance = require('./src/models/Attendance');
const fs = require('fs');

const MONGODB_URI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

// Helper to log to file and console
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync('salary_debug_log.txt', msg + '\n');
};

mongoose.connect(MONGODB_URI)
    .then(() => log('MongoDB Connected'))
    .catch(err => {
        log('Connection Error: ' + err);
        process.exit(1);
    });

async function checkSalaries() {
    // Reset log file
    fs.writeFileSync('salary_debug_log.txt', '');
    log('--- STARTING SALARY CHECK ---');

    try {
        const drivers = await User.find({ role: 'Driver' }).select('name dailyWage isFreelancer status');
        log(`Found ${drivers.length} drivers.`);

        for (const driver of drivers) {
            log('\n----------------------------------------');
            log(`Driver: ${driver.name} `);
            log(`Profile Daily Wage: ${driver.dailyWage !== undefined ? driver.dailyWage : 'NOT SET'}`);
            log(`Status: ${driver.status} | Freelancer: ${driver.isFreelancer}`);

            // Fetch last 5 completed stored attendance records
            const attendance = await Attendance.find({
                driver: driver._id,
                status: 'completed'
            }).sort({ date: -1 }).limit(5);

            if (attendance.length === 0) {
                log('  No completed attendance found.');
            } else {
                log(`  Last ${attendance.length} Completed Duties:`);
                attendance.forEach(att => {
                    const dateStr = att.date ? new Date(att.date).toISOString().split('T')[0] : 'No Date';
                    const storedWage = att.dailyWage;

                    // Logic Simulation
                    // Priority 1: att.dailyWage
                    // Priority 2: driver.dailyWage
                    // Priority 3: 500 (Default)
                    let usedWage = 500;
                    let source = 'Default (500)';

                    if (storedWage && !isNaN(Number(storedWage)) && Number(storedWage) > 0) {
                        usedWage = Number(storedWage);
                        source = 'Attendance Record';
                    } else if (driver.dailyWage && !isNaN(Number(driver.dailyWage)) && Number(driver.dailyWage) > 0) {
                        usedWage = Number(driver.dailyWage);
                        source = 'Driver Profile';
                    }

                    log(`    [${dateStr}] Stored: ${storedWage !== undefined ? storedWage : 'Missing'} | Used: ${usedWage} (${source})`);
                });
            }
        }

    } catch (error) {
        log('Script Error: ' + error.message);
    } finally {
        mongoose.disconnect();
        log('--- CHECK COMPLETE ---');
    }
}

checkSalaries();
