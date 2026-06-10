const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Firebase-based token verification (legacy)
const verifyToken = async (req, res, next) => {
  try {
    const { auth } = require('../config/firebaseAdmin');
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Unauthorized' });
  }
};

// JWT-based protect middleware (used by ERP login system)
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
    const token = authHeader.split('Bearer ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

const verifyRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const { auth } = require('../config/firebaseAdmin');
      const { uid } = req.user;
      const userRecord = await auth.getUser(uid);
      const role = userRecord.customClaims?.role;
      if (!role || !allowedRoles.includes(role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

module.exports = { verifyToken, verifyRole, protect };

