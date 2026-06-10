const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  rollNo: {
    type: String,
    required: true
  },
  class: {
    type: String,
    required: true
  },
  section: String,
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  dateOfBirth: String,
  parentName: String,
  contactNumber: String,
  address: String,
  bloodGroup: String,
  admissionDate: String,
  imageUrl: String
}, {
  timestamps: true, strict: false,
  strict: false
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
