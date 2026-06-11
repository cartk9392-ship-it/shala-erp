const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// ──────────────────────────────────────────────────────────
// Configure VAPID lazily — called before each operation
// so that env vars are guaranteed to be loaded by dotenv
// ──────────────────────────────────────────────────────────
const initVapid = () => {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@shalaerp.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
};

// ──────────────────────────────────────────────────────────
// GET /api/push/vapid-public-key
// Returns the VAPID public key so the client can subscribe
// ──────────────────────────────────────────────────────────
const getVapidPublicKey = (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(500).json({ message: 'VAPID keys not configured on server.' });
  }
  res.json({ publicKey: key });
};

// ──────────────────────────────────────────────────────────
// POST /api/push/subscribe
// Saves user's push subscription to database
// Body: { endpoint, keys: { p256dh, auth } }
// ──────────────────────────────────────────────────────────
const subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    const userId = req.user._id;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: 'Invalid subscription object.' });
    }

    // Upsert — if the same endpoint already exists, update it; else create
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId,
        endpoint,
        keys,
        userAgent: req.headers['user-agent'] || '',
        role: req.user.role,
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Push subscription saved for userId: ${userId}`);
    res.status(201).json({ message: 'Subscription saved successfully.' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ message: 'Failed to save subscription.', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────
// DELETE /api/push/unsubscribe
// Removes user's push subscription from database
// Body: { endpoint }
// ──────────────────────────────────────────────────────────
const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    await PushSubscription.findOneAndDelete({ endpoint });
    res.json({ message: 'Unsubscribed successfully.' });
  } catch (error) {
    console.error('Error removing subscription:', error);
    res.status(500).json({ message: 'Failed to unsubscribe.' });
  }
};

// ──────────────────────────────────────────────────────────
// POST /api/push/send-to-role
// Send push notification to all users with a specific role
// Body: { title, body, url, role }   role = 'teacher' | 'parent' | 'admin' | 'all'
// This is called internally whenever admin posts a new notice
// ──────────────────────────────────────────────────────────
const sendToRole = async (req, res) => {
  try {
    initVapid(); // Ensure VAPID is configured from env
    const { title, body, url = '/', role } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: 'title and body are required.' });
    }

    // Find target subscriptions
    const query = role && role !== 'all' ? { role } : {};
    const subscriptions = await PushSubscription.find(query);

    if (subscriptions.length === 0) {
      return res.json({ message: 'No subscribers found for this role.', sent: 0 });
    }

    // Payload to send — service worker will receive this in push event
    const payload = JSON.stringify({
      title,
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      url,
      tag: 'shala-erp-notice',
      actions: [
        { action: 'view',    title: '👁️ View Notice' },
        { action: 'dismiss', title: '✕ Dismiss'      },
      ],
    });

    let sent = 0;
    let failed = 0;
    const deadEndpoints = []; // Track expired subscriptions to clean up

    // Send to each subscriber — process all in parallel
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        )
      )
    );

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        sent++;
      } else {
        failed++;
        const statusCode = result.reason?.statusCode;
        // 410 Gone = subscription is no longer valid (user revoked or browser cleared)
        if (statusCode === 410 || statusCode === 404) {
          deadEndpoints.push(subscriptions[i].endpoint);
        }
      }
    });

    // Clean up dead subscriptions automatically
    if (deadEndpoints.length > 0) {
      await PushSubscription.deleteMany({ endpoint: { $in: deadEndpoints } });
      console.log(`🗑️ Cleaned up ${deadEndpoints.length} expired subscriptions.`);
    }

    res.json({ message: `Notifications sent.`, sent, failed });
  } catch (error) {
    console.error('Error sending push notifications:', error);
    res.status(500).json({ message: 'Failed to send notifications.', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────
// Internal helper — called from notice creation route
// Sends notification to targeted users without HTTP response
// ──────────────────────────────────────────────────────────
const sendPushToRole = async (title, body, url, role) => {
  try {
    initVapid(); // Ensure VAPID is configured from env
    const query = role && role !== 'All' 
      ? { role: role.toLowerCase().replace('teachers', 'teacher').replace('parents', 'parent') }
      : {};

    const subscriptions = await PushSubscription.find(query);
    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({
      title,
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      url,
      tag: 'shala-erp-notice',
      actions: [
        { action: 'view',    title: '👁️ View Notice' },
        { action: 'dismiss', title: '✕ Dismiss'      },
      ],
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
      )
    );

    const dead = results
      .map((r, i) => ({ r, sub: subscriptions[i] }))
      .filter(({ r }) => r.status === 'rejected' && [410, 404].includes(r.reason?.statusCode))
      .map(({ sub }) => sub.endpoint);

    if (dead.length > 0) {
      await PushSubscription.deleteMany({ endpoint: { $in: dead } });
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    console.log(`📣 Push sent to ${sent}/${subscriptions.length} subscribers for role: ${role || 'all'}`);
  } catch (err) {
    console.error('sendPushToRole error:', err.message);
  }
};

module.exports = { getVapidPublicKey, subscribe, unsubscribe, sendToRole, sendPushToRole };
