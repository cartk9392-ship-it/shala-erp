const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: String,
  class: String,
  amount: Number,
  dueDate: String,
  status: {
    type: String,
    enum: ['Paid', 'Pending', 'Overdue'],
    default: 'Pending'
  },
  paymentDate: String,
  paymentMethod: String
}, {
  timestamps: true, strict: false
});

const Fee = mongoose.model('Fee', feeSchema);

module.exports = Fee;
