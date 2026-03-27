/**
 * Simple in-memory cache with TTL.
 * Suitable for single-process apps; swap for Redis in multi-instance deployments.
 */
const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function set(key, value, ttlMs = 5 * 60 * 1000) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function del(key) {
  store.delete(key);
}

function flush() {
  store.clear();
}

module.exports = { get, set, del, flush };
