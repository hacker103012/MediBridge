'use strict';
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { requireRole, requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/medicines ───────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const { q, barcode } = req.query;
  let query = 'SELECT * FROM medicine_catalogue WHERE 1=1';
  const params = [];
  if (barcode) { query += ' AND barcode=?'; params.push(barcode); }
  if (q)       { query += ' AND (generic_name LIKE ? OR brand_name LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  query += ' ORDER BY generic_name LIMIT 50';
  const medicines = db.prepare(query).all(...params);
  res.json({ medicines });
});

// ── GET /api/medicines/barcode/:code ─────────────────────────
router.get('/barcode/:code', requireAuth, (req, res) => {
  const med = db.prepare('SELECT * FROM medicine_catalogue WHERE barcode=?').get(req.params.code);
  if (!med) return res.status(404).json({ error: 'UNKNOWN_PRODUCT', message: 'Barcode not found in catalogue. Manual verification required.' });
  res.json({ medicine: med });
});

// ── POST /api/medicines/verify ───────────────────────────────
// Compare scanned medicine to prescription item, record attempt
router.post('/verify', requireRole('pharmacist'), (req, res) => {
  const { prescription_id, prescription_item_id, barcode } = req.body;
  if (!prescription_id || !barcode)
    return res.status(400).json({ error: 'prescription_id and barcode are required.' });

  // Validate prescription access
  const rx = db.prepare("SELECT * FROM prescriptions WHERE id=? AND status IN ('authorized','partially_dispensed')").get(prescription_id);
  if (!rx) return res.status(404).json({ error: 'Authorized prescription not found.' });

  const item = prescription_item_id
    ? db.prepare('SELECT * FROM prescription_items WHERE id=? AND prescription_id=?').get(prescription_item_id, prescription_id)
    : db.prepare('SELECT * FROM prescription_items WHERE prescription_id=? ORDER BY sort_order LIMIT 1').get(prescription_id);

  if (!item) return res.status(404).json({ error: 'Prescription item not found.' });

  // Look up medicine catalogue
  const med = db.prepare('SELECT * FROM medicine_catalogue WHERE barcode=?').get(barcode);
  const attemptId = uuidv4();
  const now = new Date().toISOString();

  if (!med) {
    db.prepare(`INSERT INTO verification_attempts(id,prescription_id,prescription_item_id,pharmacist_id,barcode_scanned,medicine_id,result,mismatch_detail,created_at) VALUES(?,?,?,?,?,?,?,?,?)`)
      .run(attemptId,prescription_id,prescription_item_id||null,req.user.id,barcode,null,'unknown','Barcode not in catalogue',now);
    return res.json({
      result: 'amber',
      code: 'UNKNOWN_PRODUCT',
      message: 'Barcode not found in catalogue. Manual pharmacist verification required before dispensing.',
      prescribed: { generic_name: item.generic_name, strength: item.strength, strength_unit: item.strength_unit, dosage_form: item.dosage_form },
      scanned: null,
      attempt_id: attemptId
    });
  }

  // Compare
  const genericMatch  = med.generic_name.trim().toLowerCase() === item.generic_name.trim().toLowerCase();
  const strengthMatch = med.strength.toString() === item.strength.toString() && med.strength_unit === item.strength_unit;
  const formMatch     = med.dosage_form.toLowerCase() === item.dosage_form.toLowerCase();

  let result, code, message;
  if (genericMatch && strengthMatch && formMatch) {
    result  = 'match'; code = 'MATCH';
    message = 'Product verified. Matches authorized prescription.';
  } else {
    result  = 'mismatch'; code = 'MISMATCH';
    const mismatches = [];
    if (!genericMatch)  mismatches.push(`active ingredient (prescribed: ${item.generic_name}, scanned: ${med.generic_name})`);
    if (!strengthMatch) mismatches.push(`strength (prescribed: ${item.strength}${item.strength_unit}, scanned: ${med.strength}${med.strength_unit})`);
    if (!formMatch)     mismatches.push(`dosage form (prescribed: ${item.dosage_form}, scanned: ${med.dosage_form})`);
    message = `MISMATCH detected: ${mismatches.join('; ')}. Do not dispense without doctor authorization.`;
  }

  if (!med.verified) { result = 'amber'; code = 'UNVERIFIED_CATALOGUE'; message += ' Note: Catalogue entry is unverified.'; }

  const mismatchDetail = result !== 'match' ? message : null;
  db.prepare(`INSERT INTO verification_attempts(id,prescription_id,prescription_item_id,pharmacist_id,barcode_scanned,medicine_id,result,mismatch_detail,created_at) VALUES(?,?,?,?,?,?,?,?,?)`)
    .run(attemptId,prescription_id,item.id,req.user.id,barcode,med.id,result,mismatchDetail,now);

  res.json({ result, code, message, prescribed: item, scanned: med, attempt_id: attemptId });
});

// ── POST /api/medicines/dispense ─────────────────────────────
router.post('/dispense', requireRole('pharmacist'), (req, res) => {
  const { prescription_id, prescription_item_id, medicine_id, quantity_dispensed, batch_no, expiry_date, notes } = req.body;
  if (!prescription_id) return res.status(400).json({ error: 'prescription_id required.' });

  const rx = db.prepare("SELECT * FROM prescriptions WHERE id=? AND status IN ('authorized','partially_dispensed')").get(prescription_id);
  if (!rx) return res.status(404).json({ error: 'Authorized prescription not found.' });

  // Ensure no unresolved mismatch for this item
  if (prescription_item_id) {
    const lastAttempt = db.prepare(`
      SELECT result FROM verification_attempts
      WHERE prescription_id=? AND prescription_item_id=?
      ORDER BY created_at DESC LIMIT 1
    `).get(prescription_id, prescription_item_id);
    if (lastAttempt && lastAttempt.result === 'mismatch')
      return res.status(400).json({ error: 'Cannot dispense: last verification attempt resulted in a MISMATCH. Resolve the discrepancy first.' });
  }

  const now = new Date().toISOString();
  const id  = uuidv4();
  db.prepare(`INSERT INTO dispensing_records(id,prescription_id,prescription_item_id,pharmacist_id,medicine_id,quantity_dispensed,batch_no,expiry_date,dispensed_at,notes) VALUES(?,?,?,?,?,?,?,?,?,?)`)
    .run(id,prescription_id,prescription_item_id||null,req.user.id,medicine_id||null,quantity_dispensed||null,batch_no||null,expiry_date||null,now,notes||null);

  // Check if all items dispensed
  const totalItems   = db.prepare('SELECT COUNT(*) as c FROM prescription_items WHERE prescription_id=?').get(prescription_id).c;
  const dispensedItems = db.prepare('SELECT COUNT(DISTINCT prescription_item_id) as c FROM dispensing_records WHERE prescription_id=?').get(prescription_id).c;
  const newStatus = dispensedItems >= totalItems ? 'dispensed' : 'partially_dispensed';

  db.prepare(`UPDATE prescriptions SET status=?, updated_at=? WHERE id=?`).run(newStatus, now, prescription_id);
  db.prepare(`INSERT INTO prescription_audit(id,prescription_id,actor_id,event_type,event_detail,created_at) VALUES(?,?,?,?,?,?)`)
    .run(uuidv4(),prescription_id,req.user.id,newStatus==='dispensed'?'dispensed':'partially_dispensed',
        `Dispensed by ${req.user.full_name}`,now);

  // Notify patient
  db.prepare(`INSERT INTO notifications(id,user_id,type,title,body,link,channel,delivery_status,created_at) VALUES(?,?,?,?,?,?,?,?,?)`)
    .run(uuidv4(),rx.patient_id,'dispensing_complete','Medicines Dispensed',
        `Your prescription ${rx.prescription_no} has been ${newStatus==='dispensed'?'fully':'partially'} dispensed at the pharmacy.`,
        `/patient/prescriptions/${prescription_id}`,'inapp','delivered',now);

  res.json({ message: `Prescription ${newStatus}.`, record_id: id });
});

// ── GET /api/medicines/catalogue ─────────────────────────────
router.get('/catalogue', requireRole('admin','pharmacist'), (req, res) => {
  const meds = db.prepare('SELECT * FROM medicine_catalogue ORDER BY generic_name').all();
  res.json({ medicines: meds });
});

// ── POST /api/medicines/catalogue ────────────────────────────
router.post('/catalogue', requireRole('admin'), (req, res) => {
  const { barcode, generic_name, brand_name, strength, strength_unit, dosage_form, route, manufacturer, pack_size } = req.body;
  if (!generic_name || !strength || !dosage_form) return res.status(400).json({ error: 'generic_name, strength, dosage_form required.' });
  const id  = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO medicine_catalogue(id,barcode,generic_name,brand_name,strength,strength_unit,dosage_form,route,manufacturer,pack_size,catalogue_source,verified,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id,barcode||null,generic_name,brand_name||null,strength,strength_unit||'mg',dosage_form,route||'oral',manufacturer||null,pack_size||null,'manual',0,now,now);
  res.status(201).json({ medicine: db.prepare('SELECT * FROM medicine_catalogue WHERE id=?').get(id) });
});

module.exports = router;
