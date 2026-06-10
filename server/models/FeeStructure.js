const mongoose = require('mongoose');

const feeStructureSchema = new mongoose.Schema({
  _id: String,
  class: String,
  amount: Number,
  description: String,
  term: String
}, {
  timestamps: true, strict: false,
  strict: false
});

const FeeStructure = mongoose.model('FeeStructure', feeStructureSchema);

module.exports = FeeStructure;
