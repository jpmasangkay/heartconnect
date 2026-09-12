const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  base: {
    service: 'heartconnect-api',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

const logger = {
  info(message, meta = {}) {
    pinoLogger.info(meta, message);
  },
  warn(message, meta = {}) {
    pinoLogger.warn(meta, message);
  },
  error(message, meta = {}) {
    pinoLogger.error(meta, message);
  },
  debug(message, meta = {}) {
    pinoLogger.debug(meta, message);
  },
  raw: pinoLogger,
};

module.exports = logger;
