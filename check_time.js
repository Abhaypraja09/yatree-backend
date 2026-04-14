const { DateTime } = require('luxon');
console.log('JS Date:', new Date().toString());
console.log('ISO String:', new Date().toISOString());
console.log('Luxon IST:', DateTime.now().setZone('Asia/Kolkata').toString());
console.log('Luxon UTC:', DateTime.now().setZone('UTC').toString());
