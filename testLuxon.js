const { DateTime } = require('luxon');
const startOfMonth = DateTime.fromObject({ year: 2026, month: 6, day: 1 }, { zone: 'Asia/Kolkata' }).startOf('month');
const endOfMonth = startOfMonth.endOf('month');
console.log('startStr luxon:', startOfMonth.toFormat('yyyy-MM-dd'));
console.log('endStr luxon:', endOfMonth.toFormat('yyyy-MM-dd'));
const startJS = startOfMonth.toJSDate();
const endJS = endOfMonth.toJSDate();
try { console.log('startStr js:', startJS.toFormat('yyyy-MM-dd')); } catch(e) { console.log('error js toFormat'); }
