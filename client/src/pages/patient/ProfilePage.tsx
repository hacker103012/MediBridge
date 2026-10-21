import { useState, useEffect, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Bell, Shield, Save, CheckCircle } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';

export default function PatientProfilePage() {
  const { user, updateUser } = useAuth();
  const qc = useQueryClient();

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Fetch patient profile details
  const { data: patientData, isLoading: patientLoading } = useQuery({
    queryKey: ['patientProfile', user?.id],
    queryFn: () => api.get(`/patients/${user?.id}`).then(r => r.data),
    enabled: !!user?.id,
  });

  // Fetch patient preferences
  const { data: prefData } = useQuery({
    queryKey: ['patientPreferences', user?.id],
    queryFn: () => api.get(`/patients/${user?.id}/preferences`).then(r => r.data),
    enabled: !!user?.id,
  });

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    language: user?.language || 'en',
    date_of_birth: '',
    blood_group: '',
    allergies: '',
    address: '',
    emergency_contact: '',
  });

  const [prefs, setPrefs] = useState({
    reminder_enabled: 0,
    sms_consent: 0,
    whatsapp_consent: 0,
    reminder_morning: '08:00',
    reminder_afternoon: '13:00',
    reminder_evening: '18:00',
    reminder_night: '21:00',
  });

  useEffect(() => {
    if (patientData?.patient) {
      const p = patientData.patient;
      setForm(prev => ({
        ...prev,
        full_name: p.full_name || prev.full_name,
        phone: p.phone || prev.phone,
        language: p.language || prev.language,
        date_of_birth: p.date_of_birth || '',
        blood_group: p.blood_group || '',
        allergies: p.allergies || '',
        address: p.address || '',
        emergency_contact: p.emergency_contact || '',
      }));
    }
  }, [patientData]);

  useEffect(() => {
    if (prefData?.preferences) {
      const pr = prefData.preferences;
      setPrefs({
        reminder_enabled: pr.reminder_enabled ?? 0,
        sms_consent: pr.sms_consent ?? 0,
        whatsapp_consent: pr.whatsapp_consent ?? 0,
        reminder_morning: pr.reminder_morning || '08:00',
        reminder_afternoon: pr.reminder_afternoon || '13:00',
        reminder_evening: pr.reminder_evening || '18:00',
        reminder_night: pr.reminder_night || '21:00',
      });
    }
  }, [prefData]);

  const updatePatient = useMutation({
    mutationFn: () => api.patch(`/patients/${user?.id}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patientProfile', user?.id] });
      updateUser({ full_name: form.full_name, phone: form.phone, language: form.language as 'en' | 'hi' | 'mr' });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to update profile.');
    },
  });

  const updatePreferences = useMutation({
    mutationFn: () => api.patch(`/patients/${user?.id}/preferences`, prefs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patientPreferences', user?.id] });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    updatePatient.mutate();
    updatePreferences.mutate();
  };

  if (patientLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <User size={22} className="text-teal-600" /> Patient Profile & Settings
        </h1>
      </div>

      {saved && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle size={16} /> Profile and preferences saved successfully!
        </div>
      )}

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <User size={16} className="text-teal-600" /> Personal Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                className="input"
                required
                value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input className="input bg-gray-50" value={user?.email || ''} readOnly disabled />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input
                className="input"
                type="tel"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Preferred Language</label>
              <select
                className="input"
                value={form.language}
                onChange={e => setForm(p => ({ ...p, language: e.target.value as 'en' | 'hi' | 'mr' }))}
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="mr">मराठी (Marathi)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Medical Details */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Shield size={16} className="text-teal-600" /> Medical & Emergency Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date of Birth</label>
              <input
                className="input"
                type="date"
                value={form.date_of_birth}
                onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Blood Group</label>
              <select
                className="input"
                value={form.blood_group}
                onChange={e => setForm(p => ({ ...p, blood_group: e.target.value }))}
              >
                <option value="">— Select —</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label text-red-600 font-semibold">Known Drug Allergies</label>
              <input
                className="input border-red-200 focus:border-red-400 focus:ring-red-400"
                value={form.allergies}
                placeholder="e.g. Penicillin, Sulfa drugs, None known"
                onChange={e => setForm(p => ({ ...p, allergies: e.target.value }))}
              />
              <p className="text-xs text-gray-400 mt-1">
                Important: Doctors and pharmacists are alerted to these allergies before prescribing or dispensing.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Residential Address</label>
              <input
                className="input"
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Emergency Contact Details</label>
              <input
                className="input"
                value={form.emergency_contact}
                placeholder="e.g. Spouse: 9876543210"
                onChange={e => setForm(p => ({ ...p, emergency_contact: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Reminder & Notification Preferences */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Bell size={16} className="text-teal-600" /> Medication Reminders & Consent
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-teal-600"
                checked={prefs.reminder_enabled === 1}
                onChange={e => setPrefs(p => ({ ...p, reminder_enabled: e.target.checked ? 1 : 0 }))}
              />
              Enable daily dose reminder alerts
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-teal-600"
                checked={prefs.sms_consent === 1}
                onChange={e => setPrefs(p => ({ ...p, sms_consent: e.target.checked ? 1 : 0 }))}
              />
              I consent to receiving SMS notifications for prescription authorizations & dispensing
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-teal-600"
                checked={prefs.whatsapp_consent === 1}
                onChange={e => setPrefs(p => ({ ...p, whatsapp_consent: e.target.checked ? 1 : 0 }))}
              />
              I consent to receiving WhatsApp alerts for medications
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={updatePatient.isPending || updatePreferences.isPending}
            className="flex items-center gap-2"
          >
            <Save size={16} /> Save Profile & Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}
