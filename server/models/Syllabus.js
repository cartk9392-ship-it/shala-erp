const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  topicId:     { type: String, required: true },
  name:        { type: String, required: true },
  chapter:     { type: String, default: '' },
  status:      { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  dateCovered: { type: String, default: '' },
  notes:       { type: String, default: '' },
  order:       { type: Number, default: 0 }
}, { _id: false });

const syllabusSchema = new mongoose.Schema({
  _id:       { type: String },           // e.g. "10_Mathematics"
  class:     { type: String, required: true },
  subject:   { type: String, required: true },
  createdBy: { type: String, default: '' },
  topics:    [topicSchema]
}, { timestamps: true, strict: false });

module.exports = mongoose.model('Syllabus', syllabusSchema);
