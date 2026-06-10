const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema({
  _id: String,
  title: {
    type: String,
    required: true
  },
  description: String,
  class: {
    type: String,
    required: true
  },
  subject: String,
  dueDate: String,
  assignedBy: String
}, {
  timestamps: true, strict: false
});

const Homework = mongoose.model('Homework', homeworkSchema);

module.exports = Homework;
