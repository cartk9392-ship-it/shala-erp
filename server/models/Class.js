const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  section: String,
  roomNumber: String,
  teacherAssigned: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  studentCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true, strict: false
});

const Class = mongoose.model('Class', classSchema);

module.exports = Class;
