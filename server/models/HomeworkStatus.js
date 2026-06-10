const mongoose = require('mongoose');

const homeworkStatusSchema = new mongoose.Schema({
  _id: String,
  statuses: mongoose.Schema.Types.Mixed
}, {
  timestamps: true, strict: false,
  strict: false
});

const HomeworkStatus = mongoose.model('HomeworkStatus', homeworkStatusSchema);

module.exports = HomeworkStatus;
