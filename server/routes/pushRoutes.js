const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  sendToRole,
} = require('../controllers/pushController');

// ── Public: Client needs this key BEFORE subscribing ──────
router.get('/vapid-public-key', getVapidPublicKey);

// ── Protected: All other routes require login ─────────────
router.use(protect);

// Save browser push subscription to DB
router.post('/subscribe', subscribe);

// Remove browser push subscription from DB  
router.delete('/unsubscribe', unsubscribe);

// Manually trigger a push to a role (for testing / admin use)
// POST { title, body, url, role: 'teacher'|'parent'|'admin'|'all' }
router.post('/send', sendToRole);

module.exports = router;
