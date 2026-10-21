'use strict';
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { requireRole, requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/notifications ───────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const { unread_only } = req.query;
  let q = 'SELECT * FROM notifications WHERE user_id=?';
  if (unread_only === 'true') q += ' AND read=0';
  q += ' ORDER BY created_at DESC LIMIT 50';
  const notifications = db.prepare(q).all(req.user.id);
  const unread_count  = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND read=0').get(req.user.id).c;
  res.json({ notifications, unread_count });
});

// ── POST /api/notifications/:id/read ─────────────────────────
router.post('/:id/read', requireAuth, (req, res) => {
  const n = db.prepare('SELECT * FROM notifications WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!n) return res.status(404).json({ error: 'Notification not found.' });
  db.prepare('UPDATE notifications SET read=1 WHERE id=?').run(req.params.id);
  res.json({ message: 'Marked as read.' });
});

// ── POST /api/notifications/read-all ─────────────────────────
router.post('/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE user_id=?').run(req.user.id);
  res.json({ message: 'All notifications marked as read.' });
});

// ── GET /api/clarifications ──────────────────────────────────
router.get('/clarifications', requireAuth, (req, res) => {
  const u = req.user;
  let q;
  let params;
  if (u.role === 'doctor') {
    q = `SELECT c.*, p.prescription_no, p.patient_id,
               u.full_name AS from_name, u.role AS from_role
         FROM clarification_requests c
         JOIN prescriptions p ON p.id=c.prescription_id
         JOIN users u ON u.id=c.from_user_id
         WHERE c.to_user_id=?
         ORDER BY c.created_at DESC`;
    params = [u.id];
  } else if (u.role === 'pharmacist') {
    q = `SELECT c.*, p.prescription_no,
               u.full_name AS to_name
         FROM clarification_requests c
         JOIN prescriptions p ON p.id=c.prescription_id
         JOIN users u ON u.id=c.to_user_id
         WHERE c.from_user_id=?
         ORDER BY c.created_at DESC`;
    params = [u.id];
  } else {
    return res.status(403).json({ error: 'Access denied.' });
  }
  const clarifications = db.prepare(q).all(...params);
  res.json({ clarifications });
});

module.exports = router;
