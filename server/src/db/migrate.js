'use strict';
require('dotenv').config();
const db = require('./database');

console.log('Running MediBridge database migrations...');

db.exec(`
-- ============================================================
-- USERS & PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role        TEXT NOT NULL CHECK(role IN ('doctor','patient','pharmacist','admin')),
  full_name   TEXT NOT NULL,
  phone       TEXT,
  language    TEXT NOT NULL DEFAULT 'en' CHECK(language IN ('en','hi','mr')),
  is_verified INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- DOCTOR PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS doctor_profiles (
  id                TEXT PRIMARY KEY,
  user_id           TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registration_no   TEXT NOT NULL,
  council           TEXT NOT NULL,
  specialization    TEXT,
  clinic_name       TEXT,
  clinic_address    TEXT,
  city              TEXT,
  state             TEXT,
  qualification     TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified'
                    CHECK(verification_status IN ('unverified','pending','verified','rejected')),
  verification_note TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- PHARMACIST PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS pharmacist_profiles (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registration_no     TEXT NOT NULL,
  pharmacy_name       TEXT NOT NULL,
  pharmacy_address    TEXT NOT NULL,
  pharmacy_license_no TEXT NOT NULL,
  city                TEXT,
  state               TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified'
                      CHECK(verification_status IN ('unverified','pending','verified','rejected')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- PATIENT PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_profiles (
  id          TEXT PRIMARY KEY,
  user_id     TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth TEXT,
  blood_group TEXT,
  allergies   TEXT,
  address     TEXT,
  emergency_contact TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- DOCTOR → PATIENT CARE RELATIONSHIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS care_relationships (
  id          TEXT PRIMARY KEY,
  doctor_id   TEXT NOT NULL REFERENCES users(id),
  patient_id  TEXT NOT NULL REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(doctor_id, patient_id)
);

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id                    TEXT PRIMARY KEY,
  prescription_no       TEXT UNIQUE NOT NULL,
  doctor_id             TEXT NOT NULL REFERENCES users(id),
  patient_id            TEXT NOT NULL REFERENCES users(id),
  status                TEXT NOT NULL DEFAULT 'draft'
                        CHECK(status IN ('draft','awaiting_review','authorized',
                                         'partially_dispensed','dispensed','cancelled','superseded')),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  authorized_at         TEXT,
  cancelled_at          TEXT,
  notes                 TEXT,
  diagnosis             TEXT,
  valid_until           TEXT,
  parent_prescription_id TEXT REFERENCES prescriptions(id),
  image_path            TEXT,
  ocr_status            TEXT CHECK(ocr_status IN ('none','pending','extracted','reviewed','rejected'))
                        DEFAULT 'none',
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- PRESCRIPTION MEDICINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS prescription_items (
  id                TEXT PRIMARY KEY,
  prescription_id   TEXT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  generic_name      TEXT NOT NULL,
  brand_name        TEXT,
  strength          TEXT NOT NULL,
  strength_unit     TEXT NOT NULL DEFAULT 'mg',
  dosage_form       TEXT NOT NULL
                    CHECK(dosage_form IN ('tablet','capsule','liquid','injection',
                                          'syrup','cream','ointment','drops','inhaler','patch','other')),
  route             TEXT NOT NULL DEFAULT 'oral'
                    CHECK(route IN ('oral','topical','intravenous','intramuscular',
                                    'subcutaneous','inhalation','sublingual','rectal','nasal','ophthalmic','other')),
  dose_quantity     TEXT NOT NULL,
  frequency         TEXT NOT NULL,
  duration_days     INTEGER,
  food_instruction  TEXT CHECK(food_instruction IN ('before_food','after_food','with_food','empty_stomach','any','not_specified'))
                    DEFAULT 'not_specified',
  morning           INTEGER DEFAULT 0,
  afternoon         INTEGER DEFAULT 0,
  evening           INTEGER DEFAULT 0,
  night             INTEGER DEFAULT 0,
  special_instructions TEXT,
  sort_order        INTEGER DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- PRESCRIPTION AUDIT LOG (immutable)
-- ============================================================
CREATE TABLE IF NOT EXISTS prescription_audit (
  id              TEXT PRIMARY KEY,
  prescription_id TEXT NOT NULL REFERENCES prescriptions(id),
  actor_id        TEXT NOT NULL REFERENCES users(id),
  event_type      TEXT NOT NULL
                  CHECK(event_type IN ('created','updated','submitted','authorized',
                                       'cancelled','superseded','dispensed','partially_dispensed',
                                       'clarification_requested','clarification_responded',
                                       'ocr_extracted','ocr_reviewed','item_added','item_removed')),
  event_detail    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- MEDICINE CATALOGUE
-- ============================================================
CREATE TABLE IF NOT EXISTS medicine_catalogue (
  id              TEXT PRIMARY KEY,
  barcode         TEXT,
  generic_name    TEXT NOT NULL,
  brand_name      TEXT,
  strength        TEXT NOT NULL,
  strength_unit   TEXT DEFAULT 'mg',
  dosage_form     TEXT NOT NULL,
  route           TEXT DEFAULT 'oral',
  manufacturer    TEXT,
  pack_size       TEXT,
  catalogue_source TEXT DEFAULT 'manual',
  verified        INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_medicine_barcode ON medicine_catalogue(barcode);
CREATE INDEX IF NOT EXISTS idx_medicine_generic  ON medicine_catalogue(generic_name);

-- ============================================================
-- VERIFICATION ATTEMPTS (barcode scan events)
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_attempts (
  id                  TEXT PRIMARY KEY,
  prescription_id     TEXT NOT NULL REFERENCES prescriptions(id),
  prescription_item_id TEXT REFERENCES prescription_items(id),
  pharmacist_id       TEXT NOT NULL REFERENCES users(id),
  barcode_scanned     TEXT,
  medicine_id         TEXT REFERENCES medicine_catalogue(id),
  result              TEXT NOT NULL
                      CHECK(result IN ('match','mismatch','unknown','amber')),
  mismatch_detail     TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- DISPENSING RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS dispensing_records (
  id                  TEXT PRIMARY KEY,
  prescription_id     TEXT NOT NULL REFERENCES prescriptions(id),
  prescription_item_id TEXT REFERENCES prescription_items(id),
  pharmacist_id       TEXT NOT NULL REFERENCES users(id),
  medicine_id         TEXT REFERENCES medicine_catalogue(id),
  quantity_dispensed  TEXT,
  batch_no            TEXT,
  expiry_date         TEXT,
  dispensed_at        TEXT NOT NULL DEFAULT (datetime('now')),
  notes               TEXT
);

-- ============================================================
-- CLARIFICATION REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS clarification_requests (
  id              TEXT PRIMARY KEY,
  prescription_id TEXT NOT NULL REFERENCES prescriptions(id),
  from_user_id    TEXT NOT NULL REFERENCES users(id),
  to_user_id      TEXT NOT NULL REFERENCES users(id),
  message         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending','responded','closed')),
  response        TEXT,
  responded_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- OCR EXTRACTION RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS ocr_extractions (
  id                TEXT PRIMARY KEY,
  prescription_id   TEXT REFERENCES prescriptions(id),
  image_path        TEXT NOT NULL,
  provider          TEXT,
  raw_text          TEXT,
  extracted_fields  TEXT,
  confidence        REAL,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','completed','failed','reviewed')),
  reviewed_by       TEXT REFERENCES users(id),
  reviewed_at       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL
              CHECK(type IN ('prescription_authorized','dispensing_complete',
                             'mismatch_detected','clarification_request',
                             'clarification_response','reminder','system','info')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  link        TEXT,
  read        INTEGER NOT NULL DEFAULT 0,
  channel     TEXT NOT NULL DEFAULT 'inapp'
              CHECK(channel IN ('inapp','sms','whatsapp','ivr','email')),
  delivery_status TEXT DEFAULT 'delivered'
              CHECK(delivery_status IN ('pending','delivered','failed','not_configured')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

-- ============================================================
-- CONSENT & NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_preferences (
  id              TEXT PRIMARY KEY,
  user_id         TEXT UNIQUE NOT NULL REFERENCES users(id),
  sms_consent     INTEGER DEFAULT 0,
  whatsapp_consent INTEGER DEFAULT 0,
  reminder_enabled INTEGER DEFAULT 0,
  reminder_morning TEXT DEFAULT '08:00',
  reminder_afternoon TEXT DEFAULT '13:00',
  reminder_evening TEXT DEFAULT '18:00',
  reminder_night  TEXT DEFAULT '21:00',
  timezone        TEXT DEFAULT 'Asia/Kolkata',
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- MEDICATION SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_schedules (
  id                  TEXT PRIMARY KEY,
  prescription_item_id TEXT NOT NULL REFERENCES prescription_items(id) ON DELETE CASCADE,
  patient_id          TEXT NOT NULL REFERENCES users(id),
  schedule_date       TEXT NOT NULL,
  slot                TEXT NOT NULL CHECK(slot IN ('morning','afternoon','evening','night')),
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK(status IN ('pending','taken','missed','skipped')),
  taken_at            TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_schedule_patient ON medication_schedules(patient_id, schedule_date);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

console.log('✅ Database migrations complete.');
