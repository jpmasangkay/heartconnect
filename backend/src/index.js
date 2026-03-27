require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`ERROR: ${envVar} environment variable is required`);
    process.exit(1);
  }
}

const express    = require('express');
const http       = require('http');
const path       = require('path');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const mongoose   = require('mongoose');
const requestId  = require('./middleware/requestId');
const monitor    = require('./middleware/monitor');
const logger     = require('./services/logger');
const { logSecurityEvent } = require('./middleware/audit');
const { setupSocket } = require('./socket');

const app    = express();
const server = http.createServer(app);

// ─── Request ID & Monitoring ──────────────────────────────────────────────────
app.use(requestId);
app.use(monitor);

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// Limit payload size to prevent DoS
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: false }));

// ─── Static Files (uploaded files) ────────────────────────────────────────────
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, '..', 'uploads')));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

const sensitiveWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// ─── Audit Logging ────────────────────────────────────────────────────────────
app.use(logSecurityEvent);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Comma-separated browser origins for the web app (Vite). Native apps often send no Origin.
const clientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  for (const u of clientUrls) {
    if (!/^https:\/\//i.test(u)) {
      logger.warn(`CLIENT_URL entry "${u}" should use https:// in production (TLS).`);
    }
  }
}
const corsOrigin = isProd
  ? (origin, cb) => {
      if (!origin) return cb(null, true);
      if (clientUrls.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    }
  : true;

app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

// ─── REST Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',           authLimiter, require('./routes/auth'));
app.use('/api/auth/2fa',       require('./routes/twoFactor'));
app.use('/api/jobs',           require('./routes/jobs'));
app.use('/api/applications',   require('./routes/applications'));
app.use('/api/conversations',  require('./routes/conversations'));
app.use('/api/notifications',  require('./routes/notifications'));
app.use('/api/saved-jobs',     require('./routes/savedJobs'));
app.use('/api/reviews',        require('./routes/reviews'));
app.use('/api/verification',   require('./routes/verification'));
app.use('/api/reports',        sensitiveWriteLimiter, require('./routes/reports'));
app.use('/api/blocks',         require('./routes/blocks'));
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum size is 5 MB.' });
  }
  if (err.message === 'File type not allowed' || err.message === 'Only image files are allowed') {
    return res.status(400).json({ message: err.message });
  }

  logger.error('Unhandled error', {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    message: isDevelopment ? err.message : 'Internal Server Error',
  });
});

// ─── Socket.io (extracted to socket.js) ───────────────────────────────────────
const io = setupSocket(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: false,
  },
});
app.locals.io = io;

// ─── DB + Start ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    logger.info('MongoDB connected');
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server listening on port ${PORT} (bind 0.0.0.0). Point clients via env (no hardcoded IPs).`);
    });
  })
  .catch((err) => {
    logger.error('MongoDB connection failed', { error: err.message });
    process.exit(1);
  });
