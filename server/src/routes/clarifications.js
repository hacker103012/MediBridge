'use strict';
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { requireRole, requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/clarifications ──────────────────────────────────
router.post('/', requireRole('pharmacist'), (req, res) => {
  const { prescription_id, message } = req.body;
  if (!prescription_id || !message) return res.status(400).json({ error: 'prescription_id and message required.' });

  const rx = db.prepare('SELECT * FROM prescriptions WHERE id=?').get(prescription_id);
  if (!rx) return res.status(404).json({ error: 'Prescription not found.' });

  const id  = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO clarification_requests(id,prescription_id,from_user_id,to_user_id,message,status,created_at) VALUES(?,?,?,?,?,?,?)`)
    .run(id,prescription_id,req.user.id,rx.doctor_id,message,'pending',now);

  db.prepare(`INSERT INTO prescription_audit(id,prescription_id,actor_id,event_type,event_detail,created_at) VALUES(?,?,?,?,?,?)`)
    .run(uuidv4(),prescription_id,req.user.id,'clarification_requested',message,now);

  // Notify doctor
  const pharmacist = db.prepare('SELECT full_name FROM users WHERE id=?').get(req.user.id);
  db.prepare(`INSERT INTO notifications(id,user_id,type,title,body,link,channel,delivery_status,created_at) VALUES(?,?,?,?,?,?,?,?,?)`)
    .run(uuidv4(),rx.doctor_id,'clarification_request','Clarification Request',
        `${pharmacist.full_name} has raised a query about prescription ${rx.prescription_no}.`,
        `/doctor/clarifications`,'inapp','delivered',now);

  // Emit SSE to doctor (handled by SSE manager)
  emitToUser(rx.doctor_id, { type: 'clarification_request', clarification_id: id, prescription_no: rx.prescription_no });

  res.status(201).json({ message: 'Clarification request sent.', id });
});

// ── POST /api/clarifications/:id/respond ─────────────────────
router.post('/:id/respond', requireRole('doctor'), (req, res) => {
  const cl = db.prepare('SELECT * FROM clarification_requests WHERE id=?').get(req.params.id);
  if (!cl) return res.status(404).json({ error: 'Clarification not found.' });
  if (cl.to_user_id !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
  if (cl.status !== 'pending') return res.status(400).json({ error: `Already ${cl.status}.` });

  const { response } = req.body;
  if (!response) return res.status(400).json({ error: 'Response text required.' });

  const now = new Date().toISOString();
  db.prepare(`UPDATE clarification_requests SET response=?, status='responded', responded_at=? WHERE id=?`).run(response,now,cl.id);

  db.prepare(`INSERT INTO prescription_audit(id,prescription_id,actor_id,event_type,event_detail,created_at) VALUES(?,?,?,?,?,?)`)
    .run(uuidv4(),cl.prescription_id,req.user.id,'clarification_responded',response,now);

  // Notify pharmacist
  const rx = db.prepare('SELECT prescription_no FROM prescriptions WHERE id=?').get(cl.prescription_id);
  db.prepare(`INSERT INTO notifications(id,user_id,type,title,body,link,channel,delivery_status,created_at) VALUES(?,?,?,?,?,?,?,?,?)`)
    .run(uuidv4(),cl.from_user_id,'clarification_response','Doctor Response Received',
        `Dr. ${req.user.full_name} has responded to your query about ${rx.prescription_no}.`,
        `/pharmacist/clarifications`,'inapp','delivered',now);

  emitToUser(cl.from_user_id, { type: 'clarification_response', clarification_id: cl.id });

  res.json({ message: 'Response sent.' });
});

// ── GET /api/clarifications ───────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const u = req.user;
  let rows;
  if (u.role === 'doctor') {
    rows = db.prepare(`
      SELECT c.*, p.prescription_no, fu.full_name AS from_name
      FROM clarification_requests c
      JOIN prescriptions p ON p.id=c.prescription_id
      JOIN users fu ON fu.id=c.from_user_id
      WHERE c.to_user_id=? ORDER BY c.created_at DESC
    `).all(u.id);
  } else if (u.role === 'pharmacist') {
    rows = db.prepare(`
      SELECT c.*, p.prescription_no, tu.full_name AS to_name
      FROM clarification_requests c
      JOIN prescriptions p ON p.id=c.prescription_id
      JOIN users tu ON tu.id=c.to_user_id
      WHERE c.from_user_id=? ORDER BY c.created_at DESC
    `).all(u.id);
  } else {
    return res.status(403).json({ error: 'Access denied.' });
  }
  res.json({ clarifications: rows });
});

// SSE emitter (set by index.js)
let _emitToUser = () => {};
function emitToUser(userId, data) { _emitToUser(userId, data); }
function setEmitter(fn) { _emitToUser = fn; }

module.exports = router;
module.exports.setEmitter = setEmitter;
