const mongoose = require('mongoose');

const markSchema = new mongoose.Schema({
  _id: String,
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: String,
  class: String,
  subject: String,
  examType: String,
  marksObtained: Number,
  totalMarks: Number,
  grade: String,
  date: String
}, {
  timestamps: true, strict: false
});

const Mark = mongoose.model('Mark', markSchema);

module.exports = Mark;
