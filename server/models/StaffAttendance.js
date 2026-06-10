const mongoose = require('mongoose');

const StaffAttendanceSchema = new mongoose.Schema({
  _id: String, // Explicitly allow custom string IDs like teacherId_date
  teacherId: {
    type: String,
    required: true
  },
  teacherName: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late'],
    default: 'Present'
  }
}, { 
  timestamps: true,
  _id: false // Tell mongoose we provide our own _id
});

module.exports = mongoose.model('StaffAttendance', StaffAttendanceSchema);
