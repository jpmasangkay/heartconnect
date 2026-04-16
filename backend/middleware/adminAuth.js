/**
 * Admin-only middleware. Must be used AFTER the `protect` middleware.
 */
function adminAuth(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

module.exports = adminAuth;
