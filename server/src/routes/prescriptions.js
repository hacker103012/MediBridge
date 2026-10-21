'use strict';
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { requireRole, requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/prescriptions ───────────────────────────────────
// Doctor: their prescriptions; Patient: their own; Pharmacist: authorized only
router.get('/', requireAuth, (req, res) => {
  const u = req.user;
  let rows;
  if (u.role === 'doctor') {
    rows = db.prepare(`
      SELECT p.*, u.full_name AS patient_name, u.phone AS patient_phone
      FROM prescriptions p
      JOIN users u ON u.id = p.patient_id
      WHERE p.doctor_id=?
      ORDER BY p.created_at DESC
    `).all(u.id);
  } else if (u.role === 'patient') {
    rows = db.prepare(`
      SELECT p.*, u.full_name AS doctor_name
      FROM prescriptions p
      JOIN users u ON u.id = p.doctor_id
      WHERE p.patient_id=?
      ORDER BY p.created_at DESC
    `).all(u.id);
  } else if (u.role === 'pharmacist') {
    rows = db.prepare(`
      SELECT p.*, u.full_name AS patient_name, d.full_name AS doctor_name
      FROM prescriptions p
      JOIN users u ON u.id = p.patient_id
      JOIN users d ON d.id = p.doctor_id
      WHERE p.status IN ('authorized','partially_dispensed')
      ORDER BY p.created_at DESC
    `).all();
  } else if (u.role === 'admin') {
    rows = db.prepare(`
      SELECT p.*, u.full_name AS patient_name, d.full_name AS doctor_name
      FROM prescriptions p
      JOIN users u ON u.id = p.patient_id
      JOIN users d ON d.id = p.doctor_id
      ORDER BY p.created_at DESC
    `).all();
  } else {
    return res.status(403).json({ error: 'Access denied.' });
  }
  res.json({ prescriptions: rows });
});

// ── GET /api/prescriptions/:id ───────────────────────────────
router.get('/:id', requireAuth, (req, res) => {
  const u = req.user;
  const rx = db.prepare(`
    SELECT p.*, u.full_name AS patient_name, u.phone AS patient_phone,
           d.full_name AS doctor_name
    FROM prescriptions p
    JOIN users u ON u.id = p.patient_id
    JOIN users d ON d.id = p.doctor_id
    WHERE p.id=?
  `).get(req.params.id);

  if (!rx) return res.status(404).json({ error: 'Prescription not found.' });

  // Enforce access
  if (u.role === 'doctor'     && rx.doctor_id  !== u.id) return res.status(403).json({ error: 'Access denied.' });
  if (u.role === 'patient'    && rx.patient_id !== u.id) return res.status(403).json({ error: 'Access denied.' });
  if (u.role === 'pharmacist' && !['authorized','partially_dispensed'].includes(rx.status))
    return res.status(403).json({ error: 'Prescription not available for dispensing.' });

  const items = db.prepare('SELECT * FROM prescription_items WHERE prescription_id=? ORDER BY sort_order').all(req.params.id);
  const audit = db.prepare(`
    SELECT a.*, u.full_name AS actor_name, u.role AS actor_role
    FROM prescription_audit a JOIN users u ON u.id=a.actor_id
    WHERE a.prescription_id=? ORDER BY a.created_at ASC
  `).all(req.params.id);

  // Doctor profile
  const docProfile = db.prepare('SELECT * FROM doctor_profiles WHERE user_id=?').get(rx.doctor_id);
  // Patient profile
  const ptProfile  = db.prepare('SELECT * FROM patient_profiles WHERE user_id=?').get(rx.patient_id);

  res.json({ prescription: rx, items, audit, doctor_profile: docProfile, patient_profile: ptProfile });
});

// ── POST /api/prescriptions ──────────────────────────────────
router.post('/', requireRole('doctor'), (req, res) => {
  const { patient_id, notes, diagnosis, valid_until, items } = req.body;
  if (!patient_id) return res.status(400).json({ error: 'patient_id is required.' });

  // Verify care relationship or doctor ownership
  const rel = db.prepare('SELECT id FROM care_relationships WHERE doctor_id=? AND patient_id=?').get(req.user.id, patient_id);
  const patientExists = db.prepare("SELECT id FROM users WHERE id=? AND role='patient'").get(patient_id);
  if (!patientExists) return res.status(404).json({ error: 'Patient not found.' });

  const id = uuidv4();
  const now = new Date().toISOString();
  // Auto-generate prescription number
  const count = db.prepare('SELECT COUNT(*) as c FROM prescriptions').get().c;
  const rxNo  = `RX-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  db.prepare(`
    INSERT INTO prescriptions(id,prescription_no,doctor_id,patient_id,status,notes,diagnosis,valid_until,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?)
  `).run(id, rxNo, req.user.id, patient_id, 'draft', notes||null, diagnosis||null, valid_until||null, now, now);

  db.prepare(`INSERT INTO prescription_audit(id,prescription_id,actor_id,event_type,event_detail,created_at) VALUES(?,?,?,?,?,?)`)
    .run(uuidv4(),id,req.user.id,'created','Prescription draft created',now);

  // If items provided, insert them
  if (Array.isArray(items)) {
    items.forEach((item, i) => _insertItem(id, item, i+1));
  }

  // Create care relationship if not exists
  if (!rel) {
    db.prepare('INSERT OR IGNORE INTO care_relationships(id,doctor_id,patient_id,created_at) VALUES(?,?,?,?)').run(uuidv4(),req.user.id,patient_id,now);
  }

  const prescription = db.prepare('SELECT * FROM prescriptions WHERE id=?').get(id);
  const savedItems   = db.prepare('SELECT * FROM prescription_items WHERE prescription_id=?').all(id);
  res.status(201).json({ prescription, items: savedItems });
});

function _insertItem(prescriptionId, item, order) {
  const required = ['generic_name','strength','dosage_form','dose_quantity','frequency'];
  for (const f of required) {
    if (!item[f]) throw new Error(`Missing required field: ${f}`);
  }
  const id  = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO prescription_items(id,prescription_id,generic_name,brand_name,strength,strength_unit,dosage_form,route,dose_quantity,frequency,duration_days,food_instruction,morning,afternoon,evening,night,special_instructions,sort_order,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id,prescriptionId,item.generic_name,item.brand_name||null,item.strength,item.strength_unit||'mg',
       item.dosage_form,item.route||'oral',item.dose_quantity,item.frequency,
       item.duration_days||null,item.food_instruction||'not_specified',
       item.morning?1:0,item.afternoon?1:0,item.evening?1:0,item.night?1:0,
       item.special_instructions||null,order,now);
}

// ── PUT /api/prescriptions/:id ───────────────────────────────
router.put('/:id', requireRole('doctor'), (req, res) => {
  const rx = db.prepare('SELECT * FROM prescriptions WHERE id=?').get(req.params.id);
  if (!rx) return res.status(404).json({ error: 'Prescription not found.' });
  if (rx.doctor_id !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
  if (!['draft','awaiting_review'].includes(rx.status))
    return res.status(400).json({ error: `Cannot edit a prescription with status "${rx.status}". Create a replacement instead.` });

  const { notes, diagnosis, valid_until, items } = req.body;
  const now = new Date().toISOString();
  db.prepare(`UPDATE prescriptions SET notes=COALESCE(?,notes), diagnosis=COALESCE(?,diagnosis), valid_until=COALESCE(?,valid_until), updated_at=? WHERE id=?`)
    .run(notes||null,diagnosis||null,valid_until||null,now,rx.id);

  if (Array.isArray(items)) {
    db.prepare('DELETE FROM prescription_items WHERE prescription_id=?').run(rx.id);
    items.forEach((item,i) => _insertItem(rx.id,item,i+1));
    db.prepare(`INSERT INTO prescription_audit(id,prescription_id,actor_id,event_type,event_detail,created_at) VALUES(?,?,?,?,?,?)`)
      .run(uuidv4(),rx.id,req.user.id,'updated','Prescription items updated',now);
  }

  const prescription = db.prepare('SELECT * FROM prescriptions WHERE id=?').get(rx.id);
  const savedItems   = db.prepare('SELECT * FROM prescription_items WHERE prescription_id=?').all(rx.id);
  res.json({ prescription, items: savedItems });
});

// ── POST /api/prescriptions/:id/authorize ────────────────────
router.post('/:id/authorize', requireRole('doctor'), (req, res) => {
  const rx = db.prepare('SELECT * FROM prescriptions WHERE id=?').get(req.params.id);
  if (!rx) return res.status(404).json({ error: 'Prescription not found.' });
  if (rx.doctor_id !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
  if (!['draft','awaiting_review'].includes(rx.status))
    return res.status(400).json({ error: `Cannot authorize a prescription with status "${rx.status}".` });

  const items = db.prepare('SELECT * FROM prescription_items WHERE prescription_id=?').all(rx.id);
  if (items.length === 0)
    return res.status(400).json({ error: 'Prescription must have at least one medicine item before authorization.' });

  const now = new Date().toISOString();
  db.prepare(`UPDATE prescriptions SET status='authorized', authorized_at=?, updated_at=? WHERE id=?`).run(now,now,rx.id);
  db.prepare(`INSERT INTO prescription_audit(id,prescription_id,actor_id,event_type,event_detail,created_at) VALUES(?,?,?,?,?,?)`)
    .run(uuidv4(),rx.id,req.user.id,'authorized','Prescription authorized by prescribing doctor',now);

  // Notify patient
  const patient = db.prepare('SELECT full_name FROM users WHERE id=?').get(rx.patient_id);
  db.prepare(`INSERT INTO notifications(id,user_id,type,title,body,link,channel,delivery_status,created_at) VALUES(?,?,?,?,?,?,?,?,?)`)
    .run(uuidv4(),rx.patient_id,'prescription_authorized','Prescription Authorized',
        `Your prescription ${rx.prescription_no} from Dr. ${req.user.full_name} is now authorized and ready to collect.`,
        `/patient/prescriptions/${rx.id}`,'inapp','delivered',now);

  res.json({ message: 'Prescription authorized.', prescription: db.prepare('SELECT * FROM prescriptions WHERE id=?').get(rx.id) });
});

// ── POST /api/prescriptions/:id/cancel ───────────────────────
router.post('/:id/cancel', requireRole('doctor','admin'), (req, res) => {
  const rx = db.prepare('SELECT * FROM prescriptions WHERE id=?').get(req.params.id);
  if (!rx) return res.status(404).json({ error: 'Prescription not found.' });
  if (req.user.role === 'doctor' && rx.doctor_id !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
  if (['cancelled','dispensed'].includes(rx.status))
    return res.status(400).json({ error: `Prescription is already ${rx.status}.` });

  const { reason } = req.body;
  const now = new Date().toISOString();
  db.prepare(`UPDATE prescriptions SET status='cancelled', cancelled_at=?, updated_at=? WHERE id=?`).run(now,now,rx.id);
  db.prepare(`INSERT INTO prescription_audit(id,prescription_id,actor_id,event_type,event_detail,created_at) VALUES(?,?,?,?,?,?)`)
    .run(uuidv4(),rx.id,req.user.id,'cancelled',reason||'Cancelled by doctor',now);

  res.json({ message: 'Prescription cancelled.', prescription: db.prepare('SELECT * FROM prescriptions WHERE id=?').get(rx.id) });
});

// ── POST /api/prescriptions/:id/replace ──────────────────────
// Creates a replacement prescription (for correcting an authorized one)
router.post('/:id/replace', requireRole('doctor'), (req, res) => {
  const orig = db.prepare('SELECT * FROM prescriptions WHERE id=?').get(req.params.id);
  if (!orig) return res.status(404).json({ error: 'Original prescription not found.' });
  if (orig.doctor_id !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
  if (['cancelled','superseded','dispensed'].includes(orig.status))
    return res.status(400).json({ error: `Cannot replace a ${orig.status} prescription.` });

  const { notes, diagnosis, valid_until, items } = req.body;
  const now = new Date().toISOString();

  // Cancel the original
  db.prepare(`UPDATE prescriptions SET status='superseded', updated_at=? WHERE id=?`).run(now,orig.id);
  db.prepare(`INSERT INTO prescription_audit(id,prescription_id,actor_id,event_type,event_detail,created_at) VALUES(?,?,?,?,?,?)`)
    .run(uuidv4(),orig.id,req.user.id,'superseded','Superseded by replacement prescription',now);

  // Create new draft
  const newId = uuidv4();
  const count = db.prepare('SELECT COUNT(*) as c FROM prescriptions').get().c;
  const rxNo  = `RX-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  db.prepare(`
    INSERT INTO prescriptions(id,prescription_no,doctor_id,patient_id,status,notes,diagnosis,valid_until,parent_prescription_id,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)
  `).run(newId,rxNo,req.user.id,orig.patient_id,'draft',notes||null,diagnosis||null,valid_until||null,orig.id,now,now);

  if (Array.isArray(items)) items.forEach((item,i) => _insertItem(newId,item,i+1));
  db.prepare(`INSERT INTO prescription_audit(id,prescription_id,actor_id,event_type,event_detail,created_at) VALUES(?,?,?,?,?,?)`)
    .run(uuidv4(),newId,req.user.id,'created',`Replacement prescription created (replaces ${orig.prescription_no})`,now);

  const prescription = db.prepare('SELECT * FROM prescriptions WHERE id=?').get(newId);
  const savedItems   = db.prepare('SELECT * FROM prescription_items WHERE prescription_id=?').all(newId);
  res.status(201).json({ prescription, items: savedItems });
});

// ── GET /api/prescriptions/:id/qr-data ───────────────────────
router.get('/:id/qr-data', requireAuth, (req, res) => {
  const rx = db.prepare('SELECT id,prescription_no,status,patient_id,doctor_id FROM prescriptions WHERE id=?').get(req.params.id);
  if (!rx) return res.status(404).json({ error: 'Not found.' });
  if (req.user.role === 'doctor'  && rx.doctor_id  !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
  if (req.user.role === 'patient' && rx.patient_id !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
  // Return minimal data for QR — pharmacist will look up by ID
  res.json({ rx_id: rx.id, rx_no: rx.prescription_no, status: rx.status });
});

// ── POST /api/prescriptions/lookup ───────────────────────────
// Pharmacist looks up by Rx number or ID
router.post('/lookup', requireRole('pharmacist','admin'), (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required.' });

  const rx = db.prepare(`
    SELECT p.*, u.full_name AS patient_name, d.full_name AS doctor_name
    FROM prescriptions p
    JOIN users u ON u.id=p.patient_id
    JOIN users d ON d.id=p.doctor_id
    WHERE (p.id=? OR p.prescription_no=?)
    AND p.status IN ('authorized','partially_dispensed')
  `).get(query.trim(), query.trim().toUpperCase());

  if (!rx) return res.status(404).json({ error: 'No authorized prescription found for this ID.' });
  const items = db.prepare('SELECT * FROM prescription_items WHERE prescription_id=?').all(rx.id);
  const docProfile = db.prepare('SELECT * FROM doctor_profiles WHERE user_id=?').get(rx.doctor_id);
  const ptProfile  = db.prepare('SELECT * FROM patient_profiles WHERE user_id=?').get(rx.patient_id);
  res.json({ prescription: rx, items, doctor_profile: docProfile, patient_profile: ptProfile });
});

module.exports = router;
