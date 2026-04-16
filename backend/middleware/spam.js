/**
 * Basic spam detection for messages.
 * Tracks per-user: duplicate content within 5 s, flood rate (max 10 msg / min),
 * and flags link-heavy content (>3 URLs).
 */

const recentMessages = new Map(); // userId -> [{ content, ts }]
const DUPLICATE_WINDOW_MS = 5000;
const FLOOD_WINDOW_MS = 60000;
const FLOOD_MAX = 10;
const MAX_LINKS = 3;

// Clean up stale entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - FLOOD_WINDOW_MS;
  for (const [uid, entries] of recentMessages) {
    const fresh = entries.filter((e) => e.ts > cutoff);
    if (fresh.length === 0) recentMessages.delete(uid);
    else recentMessages.set(uid, fresh);
  }
}, 5 * 60 * 1000).unref();

/**
 * @param {string} userId
 * @param {string} content
 * @returns {{ blocked: boolean, reason?: string }}
 */
function checkSpam(userId, content) {
  const now = Date.now();
  const uid = String(userId);

  // Safety cap: if map is too large, trim oldest entries
  if (recentMessages.size > 10000) {
    const cutoff = now - FLOOD_WINDOW_MS;
    for (const [id, entries] of recentMessages) {
      const fresh = entries.filter((e) => e.ts > cutoff);
      if (fresh.length === 0) recentMessages.delete(id);
      else recentMessages.set(id, fresh);
    }
  }

  if (!recentMessages.has(uid)) recentMessages.set(uid, []);
  const history = recentMessages.get(uid);

  // 1. Duplicate detection
  const isDuplicate = history.some(
    (e) => e.content === content && now - e.ts < DUPLICATE_WINDOW_MS
  );
  if (isDuplicate) {
    return { blocked: true, reason: 'Duplicate message detected' };
  }

  // 2. Flood detection
  const recentCount = history.filter((e) => now - e.ts < FLOOD_WINDOW_MS).length;
  if (recentCount >= FLOOD_MAX) {
    return { blocked: true, reason: 'Message rate limit exceeded' };
  }

  // 3. Link-heavy content
  const urlRegex = /https?:\/\/[^\s]+/gi;
  const linkCount = (content.match(urlRegex) || []).length;
  if (linkCount > MAX_LINKS) {
    return { blocked: true, reason: 'Too many links in message' };
  }

  // Record this message
  history.push({ content, ts: now });

  return { blocked: false };
}

module.exports = { checkSpam };
