const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'School ERP Backend (MongoDB) is running.' });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/data', require('./routes/dataRoutes'));
app.use('/api/push', require('./routes/pushRoutes'));   // ← Web Push Notifications

// Start server
const startServer = async () => {
  await connectDB();

  // Ensure at least one admin exists in the database
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const defaultAdmin = {
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        name: process.env.ADMIN_NAME || 'School Admin',
        role: 'admin'
      };
      await User.create(defaultAdmin);
      console.log(`✅ Default admin user auto-seeded (${defaultAdmin.username})`);
    }
  } catch (err) {
    console.log('Admin seed skipped:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
