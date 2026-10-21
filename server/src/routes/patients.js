'use strict';
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { requireRole, requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/patients ─────────────────────────────────────────
// Doctor: their patients; Admin: all
router.get('/', requireRole('doctor','admin'), (req, res) => {
  const u = req.user;
  let rows;
  if (u.role === 'admin') {
    rows = db.prepare(`
      SELECT u.id, u.full_name, u.email, u.phone, u.language, u.is_verified, u.created_at,
             pp.date_of_birth, pp.blood_group, pp.allergies, pp.address
      FROM users u LEFT JOIN patient_profiles pp ON pp.user_id=u.id
      WHERE u.role='patient' ORDER BY u.full_name
    `).all();
  } else {
    rows = db.prepare(`
      SELECT u.id, u.full_name, u.email, u.phone, u.language, u.is_verified, u.created_at,
             pp.date_of_birth, pp.blood_group, pp.allergies, pp.address
      FROM users u
      JOIN care_relationships cr ON cr.patient_id=u.id
      LEFT JOIN patient_profiles pp ON pp.user_id=u.id
      WHERE cr.doctor_id=? ORDER BY u.full_name
    `).all(u.id);
  }
  res.json({ patients: rows });
});

// ── GET /api/patients/:id ─────────────────────────────────────
router.get('/:id', requireAuth, (req, res) => {
  const u = req.user;
  // Patient can only see themselves
  if (u.role === 'patient' && u.id !== req.params.id) return res.status(403).json({ error: 'Access denied.' });
  // Doctor must have care relationship
  if (u.role === 'doctor') {
    const rel = db.prepare('SELECT id FROM care_relationships WHERE doctor_id=? AND patient_id=?').get(u.id, req.params.id);
    if (!rel) return res.status(403).json({ error: 'Patient not in your care list.' });
  }

  const patient = db.prepare(`
    SELECT u.id, u.full_name, u.email, u.phone, u.language, u.is_verified, u.created_at,
           pp.date_of_birth, pp.blood_group, pp.allergies, pp.address, pp.emergency_contact
    FROM users u LEFT JOIN patient_profiles pp ON pp.user_id=u.id
    WHERE u.id=? AND u.role='patient'
  `).get(req.params.id);

  if (!patient) return res.status(404).json({ error: 'Patient not found.' });
  res.json({ patient });
});

// ── POST /api/patients ────────────────────────────────────────
// Doctor creates a minimal patient record
router.post('/', requireRole('doctor','admin'), (req, res) => {
  const { full_name, email, phone, date_of_birth, blood_group, allergies, address, language } = req.body;
  if (!full_name || !email) return res.status(400).json({ error: 'full_name and email are required.' });

  const existing = db.prepare("SELECT id FROM users WHERE email=?").get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already registered.' });

  const id  = uuidv4();
  const now = new Date().toISOString();
  // Create user with a temporary password (they can reset)
  const tempPw = 'TempPass@' + Math.floor(Math.random()*10000);
  const hash   = require('bcryptjs').hashSync(tempPw, 10);

  db.prepare(`INSERT INTO users(id,email,password_hash,role,full_name,phone,language,is_verified,is_active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,0,1,?,?)`)
    .run(id,email.toLowerCase(),hash,'patient',full_name,phone||null,language||'en',now,now);

  const profileId = uuidv4();
  db.prepare(`INSERT INTO patient_profiles(id,user_id,date_of_birth,blood_group,allergies,address,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`)
    .run(profileId,id,date_of_birth||null,blood_group||null,allergies||null,address||null,now,now);
  db.prepare(`INSERT OR IGNORE INTO patient_preferences(id,user_id,updated_at) VALUES(?,?,?)`).run(uuidv4(),id,now);

  // Create care relationship
  db.prepare('INSERT OR IGNORE INTO care_relationships(id,doctor_id,patient_id,created_at) VALUES(?,?,?,?)').run(uuidv4(),req.user.id,id,now);

  const patient = db.prepare(`
    SELECT u.id, u.full_name, u.email, u.phone, u.language, pp.date_of_birth, pp.blood_group, pp.allergies, pp.address
    FROM users u LEFT JOIN patient_profiles pp ON pp.user_id=u.id WHERE u.id=?
  `).get(id);

  res.status(201).json({ patient, temp_password: tempPw, message: 'Patient created. Share temp_password securely so they can log in and set a new password.' });
});

// ── PATCH /api/patients/:id ───────────────────────────────────
router.patch('/:id', requireAuth, (req, res) => {
  const u = req.user;
  if (u.role === 'patient' && u.id !== req.params.id) return res.status(403).json({ error: 'Access denied.' });
  if (u.role === 'doctor') {
    const rel = db.prepare('SELECT id FROM care_relationships WHERE doctor_id=? AND patient_id=?').get(u.id, req.params.id);
    if (!rel) return res.status(403).json({ error: 'Patient not in your care list.' });
  }

  const { date_of_birth, blood_group, allergies, address, emergency_contact, phone, language } = req.body;
  const now = new Date().toISOString();

  if (phone || language) {
    db.prepare('UPDATE users SET phone=COALESCE(?,phone), language=COALESCE(?,language), updated_at=? WHERE id=?')
      .run(phone||null, language||null, now, req.params.id);
  }
  db.prepare(`UPDATE patient_profiles SET date_of_birth=COALESCE(?,date_of_birth), blood_group=COALESCE(?,blood_group), allergies=COALESCE(?,allergies), address=COALESCE(?,address), emergency_contact=COALESCE(?,emergency_contact), updated_at=? WHERE user_id=?`)
    .run(date_of_birth||null,blood_group||null,allergies||null,address||null,emergency_contact||null,now,req.params.id);

  res.json({ message: 'Patient updated.' });
});

// ── GET /api/patients/:id/preferences ────────────────────────
router.get('/:id/preferences', requireAuth, (req, res) => {
  if (req.user.role === 'patient' && req.user.id !== req.params.id) return res.status(403).json({ error: 'Access denied.' });
  const prefs = db.prepare('SELECT * FROM patient_preferences WHERE user_id=?').get(req.params.id);
  res.json({ preferences: prefs });
});

// ── PATCH /api/patients/:id/preferences ──────────────────────
router.patch('/:id/preferences', requireAuth, (req, res) => {
  if (req.user.role === 'patient' && req.user.id !== req.params.id) return res.status(403).json({ error: 'Access denied.' });
  const { sms_consent, whatsapp_consent, reminder_enabled, reminder_morning, reminder_afternoon, reminder_evening, reminder_night, timezone } = req.body;
  const now = new Date().toISOString();
  db.prepare(`UPDATE patient_preferences SET sms_consent=COALESCE(?,sms_consent), whatsapp_consent=COALESCE(?,whatsapp_consent), reminder_enabled=COALESCE(?,reminder_enabled), reminder_morning=COALESCE(?,reminder_morning), reminder_afternoon=COALESCE(?,reminder_afternoon), reminder_evening=COALESCE(?,reminder_evening), reminder_night=COALESCE(?,reminder_night), timezone=COALESCE(?,timezone), updated_at=? WHERE user_id=?`)
    .run(sms_consent??null,whatsapp_consent??null,reminder_enabled??null,reminder_morning||null,reminder_afternoon||null,reminder_evening||null,reminder_night||null,timezone||null,now,req.params.id);
  res.json({ message: 'Preferences updated.' });
});

// ── GET /api/patients/:id/schedule ───────────────────────────
router.get('/:id/schedule', requireAuth, (req, res) => {
  const u = req.user;
  if (u.role === 'patient' && u.id !== req.params.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (u.role === 'doctor') {
    const rel = db.prepare('SELECT id FROM care_relationships WHERE doctor_id=? AND patient_id=?').get(u.id, req.params.id);
    if (!rel) return res.status(403).json({ error: 'Patient not in your care list.' });
  }

  const { date } = req.query;
  const today = new Date().toISOString().split('T')[0];
  const scheduleDate = date || today;

  const schedules = db.prepare(`
    SELECT * FROM medication_schedules
    WHERE patient_id=? AND schedule_date=?
  `).all(req.params.id, scheduleDate);

  res.json({ schedules, date: scheduleDate });
});

// ── POST /api/patients/:id/schedule ──────────────────────────
router.post('/:id/schedule', requireAuth, (req, res) => {
  const u = req.user;
  if (u.role === 'patient' && u.id !== req.params.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const { prescription_item_id, slot, status, schedule_date } = req.body;
  if (!prescription_item_id || !slot) {
    return res.status(400).json({ error: 'prescription_item_id and slot are required.' });
  }

  const validSlots = ['morning', 'afternoon', 'evening', 'night'];
  if (!validSlots.includes(slot)) {
    return res.status(400).json({ error: 'Invalid slot. Must be morning, afternoon, evening, or night.' });
  }

  const validStatuses = ['pending', 'taken', 'missed', 'skipped'];
  const newStatus = status || 'taken';
  if (!validStatuses.includes(newStatus)) {
    return res.status(400).json({ error: 'Invalid status. Must be pending, taken, missed, or skipped.' });
  }

  const today = new Date().toISOString().split('T')[0];
  const dateStr = schedule_date || today;
  const now = new Date().toISOString();
  const takenAt = newStatus === 'taken' ? now : null;

  // Verify item exists
  const item = db.prepare('SELECT id FROM prescription_items WHERE id=?').get(prescription_item_id);
  if (!item) {
    return res.status(404).json({ error: 'Prescription item not found.' });
  }

  // Check if entry already exists
  const existing = db.prepare(`
    SELECT id FROM medication_schedules
    WHERE prescription_item_id=? AND patient_id=? AND schedule_date=? AND slot=?
  `).get(prescription_item_id, req.params.id, dateStr, slot);

  if (existing) {
    db.prepare(`
      UPDATE medication_schedules
      SET status=?, taken_at=?
      WHERE id=?
    `).run(newStatus, takenAt, existing.id);

    const updated = db.prepare('SELECT * FROM medication_schedules WHERE id=?').get(existing.id);
    return res.json({ message: 'Schedule updated.', schedule: updated });
  } else {
    const newId = uuidv4();
    db.prepare(`
      INSERT INTO medication_schedules (id, prescription_item_id, patient_id, schedule_date, slot, status, taken_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(newId, prescription_item_id, req.params.id, dateStr, slot, newStatus, takenAt, now);

    const created = db.prepare('SELECT * FROM medication_schedules WHERE id=?').get(newId);
    return res.status(201).json({ message: 'Schedule recorded.', schedule: created });
  }
});

module.exports = router;
