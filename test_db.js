const mongoose = require('mongoose');
mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true');
const StaffAttendance = mongoose.model('StaffAttendance', new mongoose.Schema({}, {strict: false}), 'staffattendances');
const User = mongoose.model('User', new mongoose.Schema({}, {strict: false}), 'users');

User.findOne({name: 'Chandni Verma'}).then(async s => {
  const startStrQuery = '2026-05-30';
  const hist = await StaffAttendance.aggregate([
      { $match: { staff: s._id, date: { $lt: startStrQuery } } },
      { $group: {
          _id: '',
          presentCount: { $sum: { $cond: [{ $eq: ['', 'present'] }, 1, 0] } }
      }}
  ]);
  console.log('histPresentMap:', hist);
  process.exit(0);
});
