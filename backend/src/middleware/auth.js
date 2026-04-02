const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token provided' });

  const token = header.split(' ')[1];
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
