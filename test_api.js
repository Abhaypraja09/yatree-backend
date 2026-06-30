async function test() {
    try {
        const fs = require('fs');
        const env = fs.readFileSync('.env', 'utf8').replace(/\r/g, '');
        const jwtSecretLine = env.split('\n').find(l => l.startsWith('JWT_SECRET='));
        const jwtSecret = jwtSecretLine.split('=')[1].trim();
        
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: '69cb9bf871ac31c51c9e7d93', role: 'SuperAdmin', company: '698ac8b01587e01651a49443' }, jwtSecret);
        
        console.log("Token:", token);
        
        const res = await fetch('http://localhost:5005/api/admin/staff/reports?month=7&year=2026', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        
        if (data.data) {
            const chandni = data.data.find(d => d.name.includes('Chandni'));
            console.log('JULY REPORT FOR CHANDNI:');
            console.log('Previous C/F:', chandni.previousMonthCarryForward);
            console.log('Total Available:', chandni.totalLeaveAvailable);
            console.log('Utilized:', chandni.leavesTakenThisMonth);
            console.log('Extra Leaves:', chandni.extraLeaves);
        } else {
            console.log(data);
        }
    } catch(e) {
        console.error(e);
    }
}
test();
