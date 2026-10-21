'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

console.log('Seeding MediBridge demo data...');

const now = new Date().toISOString();

// Helper
function uid() { return uuidv4(); }
function hash(pw) { return bcrypt.hashSync(pw, 10); }

const DEMO_PW = 'Demo@1234';

// Demo user IDs
const adminId       = uid();
const doctorId      = uid();
const doctor2Id     = uid();
const patientId     = uid();
const patient2Id    = uid();
const pharmacistId  = uid();

// Profile IDs
const docProfileId  = uid();
const doc2ProfileId = uid();
const phProfileId   = uid();
const ptProfileId   = uid();
const pt2ProfileId  = uid();

// Prescription IDs
const rx1Id = uid();
const rx2Id = uid();
const rx3Id = uid();

// Medicine catalogue IDs
const med1 = uid();
const med2 = uid();
const med3 = uid();
const med4 = uid();
const med5 = uid();
const med6 = uid();

// ============================================================
// Users
// ============================================================
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users(id,email,password_hash,role,full_name,phone,language,is_verified,is_active,created_at,updated_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?)
`);

const users = [
  [adminId,       'admin@medibridge.demo',       hash(DEMO_PW), 'admin',       'Admin User',          '9000000000', 'en', 1, 1, now, now],
  [doctorId,      'dr.sharma@medibridge.demo',   hash(DEMO_PW), 'doctor',      'Dr. Priya Sharma',    '9000000001', 'en', 1, 1, now, now],
  [doctor2Id,     'dr.mehta@medibridge.demo',    hash(DEMO_PW), 'doctor',      'Dr. Rajesh Mehta',    '9000000002', 'en', 1, 1, now, now],
  [patientId,     'ravi.patient@medibridge.demo',hash(DEMO_PW), 'patient',     'Ravi Kumar',          '9000000003', 'mr', 1, 1, now, now],
  [patient2Id,    'anita.patient@medibridge.demo',hash(DEMO_PW),'patient',     'Anita Desai',         '9000000004', 'hi', 1, 1, now, now],
  [pharmacistId,  'pharmacist@medibridge.demo',  hash(DEMO_PW), 'pharmacist',  'Suresh Patil',        '9000000005', 'en', 1, 1, now, now],
];
users.forEach(u => insertUser.run(...u));

// ============================================================
// Doctor Profiles
// ============================================================
db.prepare(`
  INSERT OR IGNORE INTO doctor_profiles(id,user_id,registration_no,council,specialization,clinic_name,clinic_address,city,state,qualification,verification_status,created_at,updated_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
`).run(docProfileId, doctorId, 'MCI/2015/12345','Maharashtra Medical Council',
    'General Physician','City Health Clinic','123 MG Road','Pune','Maharashtra',
    'MBBS, MD','unverified',now,now);

db.prepare(`
  INSERT OR IGNORE INTO doctor_profiles(id,user_id,registration_no,council,specialization,clinic_name,clinic_address,city,state,qualification,verification_status,created_at,updated_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
`).run(doc2ProfileId, doctor2Id, 'MCI/2018/67890','Maharashtra Medical Council',
    'Cardiologist','Heart Care Centre','456 Shivaji Nagar','Mumbai','Maharashtra',
    'MBBS, DM (Cardiology)','unverified',now,now);

// ============================================================
// Pharmacist Profile
// ============================================================
db.prepare(`
  INSERT OR IGNORE INTO pharmacist_profiles(id,user_id,registration_no,pharmacy_name,pharmacy_address,pharmacy_license_no,city,state,verification_status,created_at,updated_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?)
`).run(phProfileId, pharmacistId, 'PHARM/MH/2020/001','Patil Medical Store',
    '78 Station Road, Pune','MH-PHARM-2020-001','Pune','Maharashtra','unverified',now,now);

// ============================================================
// Patient Profiles
// ============================================================
db.prepare(`
  INSERT OR IGNORE INTO patient_profiles(id,user_id,date_of_birth,blood_group,allergies,address,created_at,updated_at)
  VALUES(?,?,?,?,?,?,?,?)
`).run(ptProfileId, patientId, '1985-06-15','B+','Penicillin','12 Parvati Colony, Pune',now,now);

db.prepare(`
  INSERT OR IGNORE INTO patient_profiles(id,user_id,date_of_birth,blood_group,allergies,address,created_at,updated_at)
  VALUES(?,?,?,?,?,?,?,?)
`).run(pt2ProfileId, patient2Id, '1990-03-22','O+','None known','34 Andheri West, Mumbai',now,now);

// ============================================================
// Care Relationships
// ============================================================
db.prepare(`INSERT OR IGNORE INTO care_relationships(id,doctor_id,patient_id,created_at) VALUES(?,?,?,?)`).run(uid(),doctorId,patientId,now);
db.prepare(`INSERT OR IGNORE INTO care_relationships(id,doctor_id,patient_id,created_at) VALUES(?,?,?,?)`).run(uid(),doctorId,patient2Id,now);
db.prepare(`INSERT OR IGNORE INTO care_relationships(id,doctor_id,patient_id,created_at) VALUES(?,?,?,?)`).run(uid(),doctor2Id,patient2Id,now);

// ============================================================
// Medicine Catalogue
// ============================================================
const insertMed = db.prepare(`
  INSERT OR IGNORE INTO medicine_catalogue(id,barcode,generic_name,brand_name,strength,strength_unit,dosage_form,route,manufacturer,pack_size,catalogue_source,verified,created_at,updated_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);
const meds = [
  [med1,'8901234567890','Amoxicillin','Mox','500','mg','capsule','oral','Ranbaxy','10 capsules','manual',1,now,now],
  [med2,'8901234567891','Azithromycin','Azee','250','mg','tablet','oral','Cipla','6 tablets','manual',1,now,now],
  [med3,'8901234567892','Paracetamol','Crocin','500','mg','tablet','oral','GSK','10 tablets','manual',1,now,now],
  [med4,'8901234567893','Metformin','Glycomet','500','mg','tablet','oral','USV','10 tablets','manual',1,now,now],
  [med5,'8901234567894','Atorvastatin','Atorva','10','mg','tablet','oral','Zydus','10 tablets','manual',1,now,now],
  [med6,'8901234567895','Amoxicillin','Amoxil','250','mg','capsule','oral','Pfizer','10 capsules','manual',1,now,now],
];
meds.forEach(m => insertMed.run(...m));

// ============================================================
// Demo Prescriptions
// ============================================================
// Rx1: Authorized — Amoxicillin 500mg for Ravi Kumar
const rx1ItemId = uid();
db.prepare(`
  INSERT OR IGNORE INTO prescriptions(id,prescription_no,doctor_id,patient_id,status,created_at,authorized_at,notes,diagnosis,valid_until,updated_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?)
`).run(rx1Id,'RX-2024-0001',doctorId,patientId,'authorized',now,now,
    'Take medicine as prescribed','Bacterial throat infection',
    new Date(Date.now() + 7*86400000).toISOString(),now);

db.prepare(`
  INSERT OR IGNORE INTO prescription_items(id,prescription_id,generic_name,brand_name,strength,strength_unit,dosage_form,route,dose_quantity,frequency,duration_days,food_instruction,morning,afternoon,evening,night,special_instructions,sort_order,created_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`).run(rx1ItemId,rx1Id,'Amoxicillin','Mox','500','mg','capsule','oral',
    '1 capsule','twice daily (morning and night)',5,'after_food',1,0,0,1,
    'Complete full course of antibiotics',1,now);

db.prepare(`INSERT OR IGNORE INTO prescription_audit(id,prescription_id,actor_id,event_type,event_detail,created_at) VALUES(?,?,?,?,?,?)`).run(uid(),rx1Id,doctorId,'created','Prescription created',now);
db.prepare(`INSERT OR IGNORE INTO prescription_audit(id,prescription_id,actor_id,event_type,event_detail,created_at) VALUES(?,?,?,?,?,?)`).run(uid(),rx1Id,doctorId,'authorized','Prescription authorized by prescribing doctor',now);

// Rx2: Draft — Paracetamol for Anita
const rx2ItemId = uid();
db.prepare(`
  INSERT OR IGNORE INTO prescriptions(id,prescription_no,doctor_id,patient_id,status,created_at,notes,diagnosis,updated_at)
  VALUES(?,?,?,?,?,?,?,?,?)
`).run(rx2Id,'RX-2024-0002',doctorId,patient2Id,'draft',now,'Draft prescription','Fever and headache',now);

db.prepare(`
  INSERT OR IGNORE INTO prescription_items(id,prescription_id,generic_name,brand_name,strength,strength_unit,dosage_form,route,dose_quantity,frequency,duration_days,food_instruction,morning,afternoon,evening,night,special_instructions,sort_order,created_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`).run(rx2ItemId,rx2Id,'Paracetamol','Crocin','500','mg','tablet','oral',
    '1 tablet','thrice daily',3,'after_food',1,1,0,1,
    'Do not exceed 4g per day',1,now);

db.prepare(`INSERT OR IGNORE INTO prescription_audit(id,prescription_id,actor_id,event_type,event_detail,created_at) VALUES(?,?,?,?,?,?)`).run(uid(),rx2Id,doctorId,'created','Draft prescription created',now);

// Rx3: Authorized with dispensing demo — Metformin for Ravi
const rx3ItemId = uid();
db.prepare(`
  INSERT OR IGNORE INTO prescriptions(id,prescription_no,doctor_id,patient_id,status,created_at,authorized_at,notes,diagnosis,valid_until,updated_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?)
`).run(rx3Id,'RX-2024-0003',doctorId,patientId,'authorized',now,now,
    'Take with meals','Type 2 Diabetes Management',
    new Date(Date.now() + 30*86400000).toISOString(),now);

db.prepare(`
  INSERT OR IGNORE INTO prescription_items(id,prescription_id,generic_name,brand_name,strength,strength_unit,dosage_form,route,dose_quantity,frequency,duration_days,food_instruction,morning,afternoon,evening,night,special_instructions,sort_order,created_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`).run(rx3ItemId,rx3Id,'Metformin','Glycomet','500','mg','tablet','oral',
    '1 tablet','twice daily',30,'with_food',1,0,0,1,
    'Monitor blood sugar regularly',1,now);

db.prepare(`INSERT OR IGNORE INTO prescription_audit(id,prescription_id,actor_id,event_type,event_detail,created_at) VALUES(?,?,?,?,?,?)`).run(uid(),rx3Id,doctorId,'created','Prescription created',now);
db.prepare(`INSERT OR IGNORE INTO prescription_audit(id,prescription_id,actor_id,event_type,event_detail,created_at) VALUES(?,?,?,?,?,?)`).run(uid(),rx3Id,doctorId,'authorized','Prescription authorized',now);

// ============================================================
// Clarification request demo
// ============================================================
db.prepare(`
  INSERT OR IGNORE INTO clarification_requests(id,prescription_id,from_user_id,to_user_id,message,status,created_at)
  VALUES(?,?,?,?,?,?,?)
`).run(uid(),rx1Id,pharmacistId,doctorId,
    'Patient has penicillin allergy noted in file. Confirming Amoxicillin is still intended for this patient.','pending',now);

// ============================================================
// Notifications
// ============================================================
const insertNotif = db.prepare(`
  INSERT OR IGNORE INTO notifications(id,user_id,type,title,body,link,read,channel,delivery_status,created_at)
  VALUES(?,?,?,?,?,?,?,?,?,?)
`);
insertNotif.run(uid(),doctorId,'clarification_request','Clarification Request from Pharmacist',
    'Pharmacist has raised a query about Rx RX-2024-0001 (Ravi Kumar — Amoxicillin allergy concern).',
    '/doctor/clarifications',0,'inapp','delivered',now);
insertNotif.run(uid(),patientId,'prescription_authorized','Prescription Ready',
    'Your prescription RX-2024-0001 from Dr. Priya Sharma is now authorized and ready to collect.',
    '/patient/prescriptions',0,'inapp','delivered',now);
insertNotif.run(uid(),pharmacistId,'info','Welcome to MediBridge',
    'Your pharmacist account is set up. Search prescriptions by Rx ID or QR code.',
    '/pharmacist/find',0,'inapp','delivered',now);

// ============================================================
// Patient preferences
// ============================================================
db.prepare(`INSERT OR IGNORE INTO patient_preferences(id,user_id,reminder_enabled,sms_consent,whatsapp_consent,updated_at) VALUES(?,?,?,?,?,?)`).run(uid(),patientId,1,0,0,now);
db.prepare(`INSERT OR IGNORE INTO patient_preferences(id,user_id,reminder_enabled,sms_consent,whatsapp_consent,updated_at) VALUES(?,?,?,?,?,?)`).run(uid(),patient2Id,0,0,0,now);

console.log('');
console.log('✅ Seed complete. Demo credentials (password: Demo@1234):');
console.log('  admin@medibridge.demo        — Admin');
console.log('  dr.sharma@medibridge.demo    — Doctor (Dr. Priya Sharma)');
console.log('  dr.mehta@medibridge.demo     — Doctor (Dr. Rajesh Mehta)');
console.log('  ravi.patient@medibridge.demo — Patient (Ravi Kumar)');
console.log('  anita.patient@medibridge.demo— Patient (Anita Desai)');
console.log('  pharmacist@medibridge.demo   — Pharmacist (Suresh Patil)');
