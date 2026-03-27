const logger = require('../services/logger');

const SLOW_THRESHOLD_MS = 1000;

/**
 * Log slow requests (>1 s) and server-error responses (5xx).
 */
function monitor(req, res, next) {
  const start = Date.now();

  const originalEnd = res.end;
  res.end = function (...args) {
    const durationMs = Date.now() - start;
    const meta = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs,
    };

    if (durationMs > SLOW_THRESHOLD_MS) {
      logger.warn('Slow request', meta);
    }

    if (res.statusCode >= 500) {
      logger.error('Server error response', meta);
    }

    originalEnd.apply(this, args);
  };

  next();
}

module.exports = monitor;
