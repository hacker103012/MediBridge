import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';

export default function DoctorProfilePage() {
  const { user, updateUser } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['doctorProfile'],
    queryFn: () => api.get('/profiles/doctor').then(r => r.data),
  });

  const profile = data?.profile;

  const [form, setForm] = useState({
    registration_no: '', council: '', specialization: '', clinic_name: '',
    clinic_address: '', city: '', state: '', qualification: '',
  });

  const [userForm, setUserForm] = useState({ full_name: user?.full_name || '', phone: user?.phone || '' });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Fill form from loaded profile
  const profileLoaded = !!data;
  if (profileLoaded && profile && form.registration_no === '' && profile.registration_no) {
    setForm({
      registration_no: profile.registration_no || '',
      council: profile.council || '',
      specialization: profile.specialization || '',
      clinic_name: profile.clinic_name || '',
      clinic_address: profile.clinic_address || '',
      city: profile.city || '',
      state: profile.state || '',
      qualification: profile.qualification || '',
    });
  }

  const saveProfile = useMutation({
    mutationFn: () => api.put('/profiles/doctor', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctorProfile'] }); setSaved(true); setTimeout(() => setSaved(false), 3000); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to save profile.');
    }
  });

  const saveUser = useMutation({
    mutationFn: () => api.patch('/auth/me', userForm),
    onSuccess: (res) => { updateUser(res.data.user); setSaved(true); setTimeout(() => setSaved(false), 3000); },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    saveProfile.mutate();
    if (userForm.full_name !== user?.full_name || userForm.phone !== user?.phone) {
      saveUser.mutate();
    }
  }

  const verificationColors: Record<string,string> = {
    unverified: 'bg-gray-100 text-gray-600',
    pending:    'bg-yellow-100 text-yellow-700',
    verified:   'bg-green-100 text-green-700',
    rejected:   'bg-red-100 text-red-700',
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
        {profile?.verification_status && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${verificationColors[profile.verification_status]}`}>
            {profile.verification_status === 'verified' ? <span className="flex items-center gap-1"><CheckCircle size={12} /> Verified</span>
              : profile.verification_status === 'pending' ? 'Pending Verification'
              : profile.verification_status === 'rejected' ? <span className="flex items-center gap-1"><AlertCircle size={12} /> Rejected</span>
              : 'Unverified'}
          </span>
        )}
      </div>

      {saved && <div className="px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">✓ Profile saved successfully!</div>}
      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Account info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Account Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={userForm.full_name}
                onChange={e => setUserForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" value={userForm.phone || ''}
                onChange={e => setUserForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input bg-gray-50" value={user?.email || ''} readOnly />
            </div>
            <div>
              <label className="label">Role</label>
              <input className="input bg-gray-50 capitalize" value={user?.role || ''} readOnly />
            </div>
          </div>
        </div>

        {/* Professional info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Professional Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Registration No. *</label>
              <input className="input" required value={form.registration_no}
                onChange={e => setForm(p => ({ ...p, registration_no: e.target.value }))} placeholder="MCI/2015/12345" />
            </div>
            <div>
              <label className="label">Medical Council *</label>
              <input className="input" required value={form.council}
                onChange={e => setForm(p => ({ ...p, council: e.target.value }))} placeholder="Maharashtra Medical Council" />
            </div>
            <div>
              <label className="label">Specialization</label>
              <input className="input" value={form.specialization}
                onChange={e => setForm(p => ({ ...p, specialization: e.target.value }))} placeholder="General Physician" />
            </div>
            <div>
              <label className="label">Qualification</label>
              <input className="input" value={form.qualification}
                onChange={e => setForm(p => ({ ...p, qualification: e.target.value }))} placeholder="MBBS, MD" />
            </div>
          </div>

          <h3 className="text-sm font-medium text-gray-700 mt-2">Clinic Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Clinic Name</label>
              <input className="input" value={form.clinic_name}
                onChange={e => setForm(p => ({ ...p, clinic_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Clinic Address</label>
              <input className="input" value={form.clinic_address}
                onChange={e => setForm(p => ({ ...p, clinic_address: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={saveProfile.isPending || saveUser.isPending}
            className="flex items-center gap-2">
            <Save size={15} /> Save Profile
          </Button>
        </div>
      </form>
    </div>
  );
}
