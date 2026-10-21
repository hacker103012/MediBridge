export interface User {
  id: string;
  email: string;
  role: 'doctor' | 'patient' | 'pharmacist' | 'admin';
  full_name: string;
  phone?: string;
  language: 'en' | 'hi' | 'mr';
  is_verified: number;
  created_at?: string;
}

export interface Prescription {
  id: string;
  prescription_no: string;
  doctor_id: string;
  patient_id: string;
  status: 'draft' | 'awaiting_review' | 'authorized' | 'partially_dispensed' | 'dispensed' | 'cancelled' | 'superseded';
  created_at: string;
  authorized_at?: string;
  cancelled_at?: string;
  notes?: string;
  diagnosis?: string;
  valid_until?: string;
  image_path?: string;
  ocr_status?: string;
  patient_name?: string;
  doctor_name?: string;
  patient_phone?: string;
  updated_at: string;
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  generic_name: string;
  brand_name?: string;
  strength: string;
  strength_unit: string;
  dosage_form: string;
  route: string;
  dose_quantity: string;
  frequency: string;
  duration_days?: number;
  food_instruction: string;
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
  special_instructions?: string;
  sort_order: number;
  created_at: string;
}

export interface Medicine {
  id: string;
  barcode?: string;
  generic_name: string;
  brand_name?: string;
  strength: string;
  strength_unit: string;
  dosage_form: string;
  route: string;
  manufacturer?: string;
  pack_size?: string;
  verified: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  read: number;
  channel: string;
  delivery_status: string;
  created_at: string;
}

export interface ClarificationRequest {
  id: string;
  prescription_id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  status: 'pending' | 'responded' | 'closed';
  response?: string;
  responded_at?: string;
  created_at: string;
  prescription_no?: string;
  from_name?: string;
  to_name?: string;
}

export interface AuditEvent {
  id: string;
  prescription_id: string;
  actor_id: string;
  event_type: string;
  event_detail?: string;
  created_at: string;
  actor_name?: string;
  actor_role?: string;
}

export interface DoctorProfile {
  id: string;
  user_id: string;
  registration_no: string;
  council: string;
  specialization?: string;
  clinic_name?: string;
  clinic_address?: string;
  city?: string;
  state?: string;
  qualification?: string;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
}

export interface VerificationResult {
  result: 'match' | 'mismatch' | 'amber' | 'unknown';
  code: string;
  message: string;
  prescribed?: PrescriptionItem;
  scanned?: Medicine;
  attempt_id?: string;
}

export interface MedicationSchedule {
  id: string;
  prescription_item_id: string;
  patient_id: string;
  schedule_date: string;
  slot: 'morning' | 'afternoon' | 'evening' | 'night';
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  taken_at?: string;
  created_at: string;
}
