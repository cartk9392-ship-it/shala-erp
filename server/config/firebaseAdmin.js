const admin = require('firebase-admin');

// IMPORTANT: The user needs to download their Firebase Admin SDK private key JSON file,
// rename it to 'serviceAccountKey.json' and place it in the server/config directory.
// Or use environment variables for the credentials.

let db;
let auth;

try {
  // If we have a local service account key, use it.
  // Otherwise, fallback to application default credentials or env variables.
  const serviceAccount = require('./serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  db = admin.firestore();
  auth = admin.auth();
  console.log('Firebase Admin Initialized Successfully');
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error.message);
  console.warn('Please provide a valid serviceAccountKey.json in the server/config directory.');
}

module.exports = { admin, db, auth };
