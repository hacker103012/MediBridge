'use strict';
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { requireRole, requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/profiles/doctor ─────────────────────────────────
router.get('/doctor', requireRole('doctor'), (req, res) => {
  const profile = db.prepare('SELECT * FROM doctor_profiles WHERE user_id=?').get(req.user.id);
  res.json({ profile: profile || null });
});

// ── PUT /api/profiles/doctor ─────────────────────────────────
router.put('/doctor', requireRole('doctor'), (req, res) => {
  const { registration_no, council, specialization, clinic_name, clinic_address, city, state, qualification } = req.body;
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT id FROM doctor_profiles WHERE user_id=?').get(req.user.id);
  if (existing) {
    db.prepare(`UPDATE doctor_profiles SET registration_no=COALESCE(?,registration_no), council=COALESCE(?,council), specialization=COALESCE(?,specialization), clinic_name=COALESCE(?,clinic_name), clinic_address=COALESCE(?,clinic_address), city=COALESCE(?,city), state=COALESCE(?,state), qualification=COALESCE(?,qualification), updated_at=? WHERE user_id=?`)
      .run(registration_no||null,council||null,specialization||null,clinic_name||null,clinic_address||null,city||null,state||null,qualification||null,now,req.user.id);
  } else {
    if (!registration_no || !council) return res.status(400).json({ error: 'registration_no and council are required.' });
    db.prepare(`INSERT INTO doctor_profiles(id,user_id,registration_no,council,specialization,clinic_name,clinic_address,city,state,qualification,verification_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(uuidv4(),req.user.id,registration_no,council,specialization||null,clinic_name||null,clinic_address||null,city||null,state||null,qualification||null,'unverified',now,now);
  }
  const profile = db.prepare('SELECT * FROM doctor_profiles WHERE user_id=?').get(req.user.id);
  res.json({ profile });
});

// ── GET /api/profiles/pharmacist ─────────────────────────────
router.get('/pharmacist', requireRole('pharmacist'), (req, res) => {
  const profile = db.prepare('SELECT * FROM pharmacist_profiles WHERE user_id=?').get(req.user.id);
  res.json({ profile: profile || null });
});

// ── PUT /api/profiles/pharmacist ─────────────────────────────
router.put('/pharmacist', requireRole('pharmacist'), (req, res) => {
  const { registration_no, pharmacy_name, pharmacy_address, pharmacy_license_no, city, state } = req.body;
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT id FROM pharmacist_profiles WHERE user_id=?').get(req.user.id);
  if (existing) {
    db.prepare(`UPDATE pharmacist_profiles SET registration_no=COALESCE(?,registration_no), pharmacy_name=COALESCE(?,pharmacy_name), pharmacy_address=COALESCE(?,pharmacy_address), pharmacy_license_no=COALESCE(?,pharmacy_license_no), city=COALESCE(?,city), state=COALESCE(?,state), updated_at=? WHERE user_id=?`)
      .run(registration_no||null,pharmacy_name||null,pharmacy_address||null,pharmacy_license_no||null,city||null,state||null,now,req.user.id);
  } else {
    if (!registration_no || !pharmacy_name || !pharmacy_address || !pharmacy_license_no)
      return res.status(400).json({ error: 'registration_no, pharmacy_name, pharmacy_address, pharmacy_license_no are required.' });
    db.prepare(`INSERT INTO pharmacist_profiles(id,user_id,registration_no,pharmacy_name,pharmacy_address,pharmacy_license_no,city,state,verification_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
      .run(uuidv4(),req.user.id,registration_no,pharmacy_name,pharmacy_address,pharmacy_license_no,city||null,state||null,'unverified',now,now);
  }
  const profile = db.prepare('SELECT * FROM pharmacist_profiles WHERE user_id=?').get(req.user.id);
  res.json({ profile });
});

// ── GET /api/profiles/admin/users ────────────────────────────
router.get('/admin/users', requireRole('admin'), (req, res) => {
  const users = db.prepare('SELECT id,email,role,full_name,phone,language,is_verified,is_active,created_at FROM users ORDER BY created_at DESC').all();
  res.json({ users });
});

// ── POST /api/profiles/admin/verify ──────────────────────────
router.post('/admin/verify', requireRole('admin'), (req, res) => {
  const { user_id, role, status, note } = req.body;
  const now = new Date().toISOString();
  if (role === 'doctor') {
    db.prepare('UPDATE doctor_profiles SET verification_status=?, verification_note=?, updated_at=? WHERE user_id=?').run(status,note||null,now,user_id);
    if (status === 'verified') db.prepare('UPDATE users SET is_verified=1, updated_at=? WHERE id=?').run(now,user_id);
  } else if (role === 'pharmacist') {
    db.prepare('UPDATE pharmacist_profiles SET verification_status=?, updated_at=? WHERE user_id=?').run(status,now,user_id);
    if (status === 'verified') db.prepare('UPDATE users SET is_verified=1, updated_at=? WHERE id=?').run(now,user_id);
  }
  res.json({ message: `${role} ${status}.` });
});

// ── GET /api/profiles/admin/audit ────────────────────────────
router.get('/admin/audit', requireRole('admin'), (req, res) => {
  const { prescription_id, limit = 100 } = req.query;
  let q = `SELECT a.*, u.full_name AS actor_name, u.role AS actor_role, p.prescription_no FROM prescription_audit a JOIN users u ON u.id=a.actor_id JOIN prescriptions p ON p.id=a.prescription_id`;
  const params = [];
  if (prescription_id) { q += ' WHERE a.prescription_id=?'; params.push(prescription_id); }
  q += ` ORDER BY a.created_at DESC LIMIT ${parseInt(limit)}`;
  const events = db.prepare(q).all(...params);
  res.json({ events });
});

module.exports = router;
