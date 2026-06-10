const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  _id: String,
  key: String,
  value: mongoose.Schema.Types.Mixed
}, {
  timestamps: true, strict: false,
  strict: false
});

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
