'use strict';
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db       = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function signAccess(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}
function signRefresh(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

// ── POST /api/auth/register ──────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password, role, full_name, phone, language } = req.body;

  if (!email || !password || !role || !full_name)
    return res.status(400).json({ error: 'email, password, role, and full_name are required.' });

  const VALID_ROLES = ['doctor', 'patient', 'pharmacist'];
  if (!VALID_ROLES.includes(role))
    return res.status(400).json({ error: 'Invalid role. Must be doctor, patient, or pharmacist.' });

  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: 'Email already registered.' });

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  const now  = new Date().toISOString();

  db.prepare(`
    INSERT INTO users(id,email,password_hash,role,full_name,phone,language,is_verified,is_active,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,0,1,?,?)
  `).run(id, email.toLowerCase().trim(), hash, role, full_name, phone || null, language || 'en', now, now);

  // Create role-specific empty profile
  const profileId = uuidv4();
  if (role === 'patient') {
    db.prepare(`INSERT INTO patient_profiles(id,user_id,created_at,updated_at) VALUES(?,?,?,?)`).run(profileId,id,now,now);
    db.prepare(`INSERT INTO patient_preferences(id,user_id,updated_at) VALUES(?,?,?)`).run(uuidv4(),id,now);
  }

  const user = db.prepare('SELECT id,email,role,full_name,language,is_verified FROM users WHERE id=?').get(id);
  const accessToken  = signAccess(user);
  const refreshToken = signRefresh(user);
  const rtHash = bcrypt.hashSync(refreshToken, 10);
  const exp = new Date(Date.now() + 7 * 86400000).toISOString();
  db.prepare(`INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?)`).run(uuidv4(),id,rtHash,exp,now);

  res.status(201).json({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name, language: user.language, is_verified: user.is_verified } });
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  const user = db.prepare('SELECT * FROM users WHERE email=? AND is_active=1').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid email or password.' });

  const accessToken  = signAccess(user);
  const refreshToken = signRefresh(user);
  const rtHash = bcrypt.hashSync(refreshToken, 10);
  const now = new Date().toISOString();
  const exp = new Date(Date.now() + 7 * 86400000).toISOString();
  db.prepare(`INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?)`).run(uuidv4(),user.id,rtHash,exp,now);

  res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name, language: user.language, is_verified: user.is_verified } });
});

// ── POST /api/auth/refresh ───────────────────────────────────
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required.' });

  let payload;
  try { payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid or expired refresh token.' }); }

  const stored = db.prepare(`SELECT * FROM refresh_tokens WHERE user_id=? AND expires_at > datetime('now') ORDER BY created_at DESC`).all(payload.id);
  const valid = stored.find(r => bcrypt.compareSync(refreshToken, r.token_hash));
  if (!valid) return res.status(401).json({ error: 'Refresh token not recognised.' });

  const user = db.prepare('SELECT * FROM users WHERE id=? AND is_active=1').get(payload.id);
  if (!user) return res.status(401).json({ error: 'User not found.' });

  const accessToken = signAccess(user);
  res.json({ accessToken });
});

// ── POST /api/auth/logout ────────────────────────────────────
router.post('/logout', requireAuth, (req, res) => {
  db.prepare('DELETE FROM refresh_tokens WHERE user_id=?').run(req.user.id);
  res.json({ message: 'Logged out successfully.' });
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.email, u.role, u.full_name, u.phone, u.language, u.is_verified, u.created_at
    FROM users u WHERE u.id=?
  `).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user });
});

// ── PATCH /api/auth/me ───────────────────────────────────────
router.patch('/me', requireAuth, (req, res) => {
  const { full_name, phone, language } = req.body;
  const now = new Date().toISOString();
  db.prepare(`UPDATE users SET full_name=COALESCE(?,full_name), phone=COALESCE(?,phone), language=COALESCE(?,language), updated_at=? WHERE id=?`)
    .run(full_name||null, phone||null, language||null, now, req.user.id);
  const user = db.prepare('SELECT id,email,role,full_name,phone,language,is_verified FROM users WHERE id=?').get(req.user.id);
  res.json({ user });
});

module.exports = router;
