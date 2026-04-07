const jwt = require('jsonwebtoken');
const User = require('../models/User');

const COOKIE_NAME = 'hc_token';

module.exports = async (req, res, next) => {
  // Prefer httpOnly cookie; fall back to Authorization header for Socket.io & legacy clients
  let token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) token = header.split(' ')[1];
  }

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'heartconnect', audience: 'heartconnect-api' });
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    if (req.user.isBanned) {
      return res.status(403).json({
        message: 'Your account has been banned.',
        banReason: req.user.banReason || null,
      });
    }
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports.COOKIE_NAME = COOKIE_NAME;
