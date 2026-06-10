const mongoose = require('mongoose');

const subjectSlotSchema = new mongoose.Schema({
  subject:  { type: String, required: true },
  date:     { type: String, required: true }, // 'YYYY-MM-DD'
  time:     { type: String, default: '09:00' },
  duration: { type: String, default: '1 hour' },
  maxMarks: { type: Number, default: 100 },
  marksEntered: { type: Boolean, default: false }
}, { _id: false });

const examScheduleSchema = new mongoose.Schema({
  _id:       { type: String },            // e.g. "10_Surprise_Test_1"
  examName:  { type: String, required: true },
  class:     { type: String, required: true },
  createdBy: { type: String },            // teacherId
  status:    { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
  subjects:  [subjectSlotSchema]
}, { timestamps: true, strict: false });

module.exports = mongoose.model('ExamSchedule', examScheduleSchema);
