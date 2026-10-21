'use strict';
require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const fs           = require('fs');
const { requireAuth } = require('./middleware/auth');

// Routes
const authRoutes          = require('./routes/auth');
const prescriptionRoutes  = require('./routes/prescriptions');
const medicineRoutes      = require('./routes/medicines');
const patientRoutes       = require('./routes/patients');
const profileRoutes       = require('./routes/profiles');
const notificationRoutes  = require('./routes/notifications');
const clarificationRoutes = require('./routes/clarifications');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Ensure upload dir exists ──────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── Security headers ──────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'https://medibridge-4-x6m2.onrender.com'],
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate limiting ─────────────────────────────────────────────
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many requests. Try again in 15 minutes.' } });
const apiLimiter  = rateLimit({ windowMs:  1 * 60 * 1000, max: 120 });
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ── SSE connection registry ───────────────────────────────────
// Map<userId, Set<Response>>
const sseClients = new Map();

function addSSEClient(userId, res) {
  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId).add(res);
}
function removeSSEClient(userId, res) {
  sseClients.get(userId)?.delete(res);
}
function emitToUser(userId, data) {
  const clients = sseClients.get(userId);
  if (!clients) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { removeSSEClient(userId, res); }
  }
}

// Wire up SSE emitter to clarifications router
clarificationRoutes.setEmitter(emitToUser);

// ── SSE Endpoint ──────────────────────────────────────────────
app.get('/api/sse', requireAuth, (req, res) => {
  res.set({
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: 'connected', userId: req.user.id })}\n\n`);

  addSSEClient(req.user.id, res);

  // Heartbeat
  const hb = setInterval(() => { try { res.write(': heartbeat\n\n'); } catch { clearInterval(hb); } }, 30000);

  req.on('close', () => {
    clearInterval(hb);
    removeSSEClient(req.user.id, res);
  });
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/prescriptions',  prescriptionRoutes);
app.use('/api/medicines',      medicineRoutes);
app.use('/api/patients',       patientRoutes);
app.use('/api/profiles',       profileRoutes);
app.use('/api/notifications',  notificationRoutes);
app.use('/api/clarifications', clarificationRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MediBridge API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: {
      ocr_provider: process.env.OCR_PROVIDER || 'none (manual fallback)',
      sms_provider: process.env.TWILIO_ACCOUNT_SID ? 'twilio' : 'none (in-app only)',
      whatsapp_provider: process.env.WATI_API_TOKEN ? 'wati' : 'none (in-app only)'
    }
  });
});

// ── 404 handler ───────────────────────────────────────────────
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message || err);
  if (process.env.NODE_ENV === 'development') console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║     MediBridge API Server — v1.0.0        ║');
  console.log(`║     Listening on http://localhost:${PORT}    ║`);
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');
  console.log(`  CLIENT_ORIGIN : ${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}`);
  console.log(`  NODE_ENV      : ${process.env.NODE_ENV}`);
  console.log(`  OCR Provider  : ${process.env.OCR_PROVIDER || 'not configured (manual fallback)'}`);
  console.log('');
});
