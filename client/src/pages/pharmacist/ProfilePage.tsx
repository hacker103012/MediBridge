import { useState, useEffect, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Save, CheckCircle, ShieldCheck } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';

export default function PharmacistProfilePage() {
  const { user, updateUser } = useAuth();
  const qc = useQueryClient();

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pharmacistProfile'],
    queryFn: () => api.get('/profiles/pharmacist').then(r => r.data),
  });

  const profile = data?.profile;

  const [form, setForm] = useState({
    registration_no: '',
    pharmacy_name: '',
    pharmacy_address: '',
    pharmacy_license_no: '',
    city: '',
    state: '',
  });

  const [userForm, setUserForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        registration_no: profile.registration_no || '',
        pharmacy_name: profile.pharmacy_name || '',
        pharmacy_address: profile.pharmacy_address || '',
        pharmacy_license_no: profile.pharmacy_license_no || '',
        city: profile.city || '',
        state: profile.state || '',
      });
    }
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: () => api.put('/profiles/pharmacist', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pharmacistProfile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to save pharmacy credentials.');
    },
  });

  const saveUser = useMutation({
    mutationFn: () => api.patch('/auth/me', userForm),
    onSuccess: res => {
      updateUser(res.data.user);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    saveProfile.mutate();
    if (userForm.full_name !== user?.full_name || userForm.phone !== user?.phone) {
      saveUser.mutate();
    }
  };

  const verificationBadgeColors: Record<string, string> = {
    verified: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
    unverified: 'bg-gray-100 text-gray-600',
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 size={22} className="text-purple-600" /> Pharmacist & Store Profile
        </h1>

        {profile?.verification_status && (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${
              verificationBadgeColors[profile.verification_status] || 'bg-gray-100 text-gray-600'
            }`}
          >
            <ShieldCheck size={14} /> {profile.verification_status}
          </span>
        )}
      </div>

      {saved && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle size={16} /> Pharmacy credentials saved successfully!
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
          <h2 className="font-semibold text-gray-800">Pharmacist Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                className="input"
                required
                value={userForm.full_name}
                onChange={e => setUserForm(p => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input className="input bg-gray-50" value={user?.email || ''} readOnly disabled />
            </div>
            <div>
              <label className="label">Contact Phone</label>
              <input
                className="input"
                type="tel"
                value={userForm.phone}
                onChange={e => setUserForm(p => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Role</label>
              <input className="input bg-gray-50 capitalize" value={user?.role || ''} readOnly disabled />
            </div>
          </div>
        </div>

        {/* Pharmacy Establishment Details */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Licensed Pharmacy Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Pharmacy Registration No. *</label>
              <input
                className="input font-mono"
                required
                value={form.registration_no}
                placeholder="e.g. PHARM/MH/2020/001"
                onChange={e => setForm(p => ({ ...p, registration_no: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Drug License Number *</label>
              <input
                className="input font-mono"
                required
                value={form.pharmacy_license_no}
                placeholder="e.g. MH-PHARM-2020-001"
                onChange={e => setForm(p => ({ ...p, pharmacy_license_no: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Pharmacy Commercial Name *</label>
              <input
                className="input"
                required
                value={form.pharmacy_name}
                placeholder="e.g. Patil Medical Store"
                onChange={e => setForm(p => ({ ...p, pharmacy_name: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Pharmacy Physical Address *</label>
              <input
                className="input"
                required
                value={form.pharmacy_address}
                placeholder="e.g. 78 Station Road"
                onChange={e => setForm(p => ({ ...p, pharmacy_address: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">City</label>
              <input
                className="input"
                value={form.city}
                placeholder="e.g. Pune"
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">State</label>
              <input
                className="input"
                value={form.state}
                placeholder="e.g. Maharashtra"
                onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={saveProfile.isPending || saveUser.isPending}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <Save size={16} /> Save Pharmacy Profile
          </Button>
        </div>
      </form>
    </div>
  );
}
