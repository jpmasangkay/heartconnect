/**
 * Simple in-memory cache with TTL.
 * Suitable for single-process apps; swap for Redis in multi-instance deployments.
 */
const store = new Map();
const MAX_ENTRIES = 1000;

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
  // Evict expired entries if approaching limit
  if (store.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, entry] of store) {
      if (now > entry.expiresAt) store.delete(k);
    }
    // If still at limit, evict oldest entry
    if (store.size >= MAX_ENTRIES) {
      const firstKey = store.keys().next().value;
      store.delete(firstKey);
    }
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function del(key) {
  store.delete(key);
}

function flush() {
  store.clear();
}

module.exports = { get, set, del, flush };
