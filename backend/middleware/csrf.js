const { doubleCsrf } = require('csrf-csrf');

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'heartconnect-csrf-secret-key-32-chars-minimum';
const isProd = process.env.NODE_ENV === 'production';

const {
  invalidCsrfTokenError,
  generateToken,
  validateRequest,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  cookieName: '__Host-hc.x-csrf-token',
  cookieOptions: {
    sameSite: isProd ? 'strict' : 'lax',
    secure: isProd,
    signed: false,
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.headers['x-csrf-token'] || req.body?._csrf,
});

module.exports = {
  invalidCsrfTokenError,
  generateCsrfToken: generateToken,
  validateCsrfRequest: validateRequest,
  doubleCsrfProtection,
};
