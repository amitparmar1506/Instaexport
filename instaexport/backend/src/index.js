require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const commentsRoutes = require('./routes/comments');
const exportRoutes = require('./routes/export');
const razorpayRoutes = require('./routes/razorpay');
const jobRoutes = require('./routes/jobs');
const { initQueue } = require('./workers/queue');

const app = express();
app.set('trust proxy', 1); // Required for Railway/Vercel proxy
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://commentexport.vercel.app',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn('[CORS] Blocked origin:', origin);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ── Security ──────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// ── Rate limiting ──────────────────────────────

app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    console.log(
      `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms origin=${req.headers.origin || '-'}`
    );
  });

  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many export requests, please try again later.' }
});
app.use('/api/export', exportLimiter);

// ── Routes ────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/razorpay', razorpayRoutes);
app.use('/api/jobs', jobRoutes);

// ── Health check ──────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Global error handler ──────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// ── Start ─────────────────────────────────────
async function start() {
  try {
    await initQueue();
    console.log('[Queue] pg-boss initialized');
    app.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`));
  } catch (err) {
    console.error('[Startup] Failed:', err);
    process.exit(1);
  }
}

start();
