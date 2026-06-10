const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  _id: String,
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: String,
  class: String,
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late'],
    required: true
  }
}, {
  timestamps: true, strict: false
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
