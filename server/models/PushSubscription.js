const mongoose = require('mongoose');

// ──────────────────────────────────────────────────────────
// PushSubscription Model
// Stores the push subscription object for each user.
// This is what the server uses to send targeted notifications.
// ──────────────────────────────────────────────────────────
const pushSubscriptionSchema = new mongoose.Schema(
  {
    // Reference to which user owns this subscription
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The subscription endpoint URL (unique per browser/device)
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    // Encryption keys required to send encrypted push payloads
    keys: {
      p256dh: { type: String, required: true },
      auth:   { type: String, required: true },
    },
    // User agent string — helps identify which device subscribed
    userAgent: { type: String, default: '' },
    // The role of the user at time of subscription (for group targeting)
    role: {
      type: String,
      enum: ['admin', 'teacher', 'parent'],
      default: 'teacher',
    },
  },
  { timestamps: true }
);

// Index for fast lookup by userId
pushSubscriptionSchema.index({ userId: 1 });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
