const DOMPurify = require('isomorphic-dompurify');

/**
 * In-place recursive sanitization to strip MongoDB query injection operators ($ and .)
 * Safe for Node.js / Express where req.query might be getter-only.
 */
function cleanNoSqlInjection(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'object' && obj[i] !== null) {
        cleanNoSqlInjection(obj[i]);
      } else if (typeof obj[i] === 'string') {
        obj[i] = DOMPurify.sanitize(obj[i]);
      }
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    // Check if key contains MongoDB injection characters ($ prefix or dot notation)
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
      continue;
    }

    const val = obj[key];
    if (typeof val === 'object' && val !== null) {
      cleanNoSqlInjection(val);
    } else if (typeof val === 'string') {
      obj[key] = DOMPurify.sanitize(val);
    }
  }

  return obj;
}

/**
 * Express middleware for NoSQL query injection & XSS sanitization
 */
function sanitizeRequest(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    cleanNoSqlInjection(req.body);
  }
  if (req.params && typeof req.params === 'object') {
    cleanNoSqlInjection(req.params);
  }
  if (req.query && typeof req.query === 'object') {
    cleanNoSqlInjection(req.query);
  }
  next();
}

module.exports = {
  cleanNoSqlInjection,
  sanitizeRequest,
};
