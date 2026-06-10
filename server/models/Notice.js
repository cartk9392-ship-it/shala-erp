const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  target: {
    type: String,
    enum: ['All', 'Teachers', 'Parents', 'Students'],
    default: 'All'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  date: {
    type: String,
    default: () => new Date().toLocaleDateString()
  }
}, {
  timestamps: true, strict: false
});

const Notice = mongoose.model('Notice', noticeSchema);

module.exports = Notice;
