/**
 * Structured JSON logger.
 * In production this would pipe to ELK / CloudWatch / Datadog.
 * Locally it outputs coloured text for readability.
 */
const isDev = process.env.NODE_ENV !== 'production';

function formatLog(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  if (isDev) {
    const prefix = { info: 'ℹ️', warn: '⚠️', error: '❌' }[level] || '•';
    const metaStr = Object.keys(meta).length
      ? ' ' + JSON.stringify(meta)
      : '';
    return `${prefix} [${entry.timestamp}] ${message}${metaStr}`;
  }

  return JSON.stringify(entry);
}

const logger = {
  info(message, meta) {
    console.log(formatLog('info', message, meta));
  },
  warn(message, meta) {
    console.warn(formatLog('warn', message, meta));
  },
  error(message, meta) {
    console.error(formatLog('error', message, meta));
  },
};

module.exports = logger;
