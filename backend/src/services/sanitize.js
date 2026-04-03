/**
 * Sanitization utilities for safe API responses and email templates.
 */

/**
 * Sensitive fields that should never be sent to clients.
 */
const SENSITIVE_FIELDS = [
  'password',
  'twoFactorSecret',
  'resetPasswordToken',
  'resetPasswordExpires',
  '_email2FACode',
  '_email2FACodeExpires',
  '__v',
];

/**
 * Strips sensitive fields from a user object before sending to clients.
 * Accepts either a Mongoose document or a plain object.
 * @param {object} user
 * @returns {object} sanitised plain object
 */
function sanitizeUser(user) {
  if (!user) return user;
  const obj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  for (const key of SENSITIVE_FIELDS) {
    delete obj[key];
  }
  return obj;
}

/**
 * Escapes HTML special characters to prevent injection in email templates.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { sanitizeUser, escapeHtml };
