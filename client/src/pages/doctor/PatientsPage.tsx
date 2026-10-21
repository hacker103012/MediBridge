import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Phone, Droplet, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import { formatDate } from '../../lib/utils';

interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  blood_group?: string;
  allergies?: string;
}

export default function DoctorPatientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Patient | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients').then(r => r.data),
  });

  const patients: Patient[] = data?.patients || [];
  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    return !q || p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || (p.phone || '').includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">My Patients</h1>
        <span className="text-sm text-gray-400">{patients.length} patient{patients.length !== 1 ? 's' : ''} under your care</span>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search by name, email or phone…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <UserPlus size={40} className="mx-auto mb-2 opacity-30" />
          <p>No patients found.</p>
          <p className="text-xs mt-1">Add a new patient by creating a prescription for them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="card hover:border-teal-200 border border-transparent transition-colors cursor-pointer"
                 onClick={() => setSelected(p)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{p.full_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.email}</p>
                </div>
                {p.allergies && p.allergies !== 'None known' && (
                  <span title="Has allergies">
                    <AlertTriangle size={16} className="text-red-400 shrink-0" />
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                {p.phone && (
                  <span className="flex items-center gap-1"><Phone size={12} /> {p.phone}</span>
                )}
                {p.blood_group && (
                  <span className="flex items-center gap-1"><Droplet size={12} /> {p.blood_group}</span>
                )}
                {p.date_of_birth && (
                  <span>DOB: {formatDate(p.date_of_birth)}</span>
                )}
              </div>
              {p.allergies && (
                <p className="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                  ⚠ Allergies: {p.allergies}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Patient detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 text-lg">{selected.full_name}</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-gray-400">Email</dt><dd className="text-gray-700">{selected.email}</dd></div>
              {selected.phone && <div><dt className="text-gray-400">Phone</dt><dd className="text-gray-700">{selected.phone}</dd></div>}
              {selected.date_of_birth && <div><dt className="text-gray-400">Date of Birth</dt><dd className="text-gray-700">{formatDate(selected.date_of_birth)}</dd></div>}
              {selected.blood_group && <div><dt className="text-gray-400">Blood Group</dt><dd className="text-gray-700">{selected.blood_group}</dd></div>}
              {selected.allergies && (
                <div>
                  <dt className="text-red-500 font-semibold">⚠ Allergies</dt>
                  <dd className="text-red-700 bg-red-50 rounded px-2 py-1 mt-1">{selected.allergies}</dd>
                </div>
              )}
            </dl>
            <div className="flex gap-2 pt-2">
              <button className="btn-secondary flex-1" onClick={() => setSelected(null)}>Close</button>
              <button className="btn-primary flex-1" onClick={() => { setSelected(null); navigate('/doctor/prescriptions/new'); }}>
                New Prescription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
