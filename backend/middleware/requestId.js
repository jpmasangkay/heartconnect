const crypto = require('crypto');

/**
 * Attach a unique request ID (UUID v4) to every request.
 * Available as req.id and returned in the X-Request-Id response header.
 */
function requestId(req, res, next) {
  const id = crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}

module.exports = requestId;
