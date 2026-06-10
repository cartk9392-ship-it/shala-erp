const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'parent'],
    required: true
  },
  // Teacher specific
  subject: String,
  classAssigned: String,
  // Parent specific
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  lastReadNoticeTime: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  strict: false
});

// userSchema.pre('save', async function() {
//   if (!this.isModified('password') || !this.password) return;
//   if (this.password.startsWith('$2')) return;
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
// });

// Match password method (supports bcrypt hash and legacy plain text)
userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password || !enteredPassword) return false;
  if (this.password.startsWith('$2')) {
    return bcrypt.compare(enteredPassword, this.password);
  }
  return enteredPassword === this.password;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
