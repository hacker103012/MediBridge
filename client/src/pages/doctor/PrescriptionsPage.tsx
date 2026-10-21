import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import { useState } from 'react';
import api from '../../lib/api';
import { formatDate } from '../../lib/utils';
import StatusBadge from '../../components/ui/StatusBadge';
import type { Prescription } from '../../types';

export default function DoctorPrescriptionsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['prescriptions', 'doctor'],
    queryFn: () => api.get('/prescriptions').then(r => r.data),
  });

  const prescriptions: Prescription[] = data?.prescriptions || [];

  const filtered = prescriptions.filter(rx => {
    const q = search.toLowerCase();
    const matchSearch = !q || rx.prescription_no.toLowerCase().includes(q) ||
      (rx.patient_name || '').toLowerCase().includes(q) ||
      (rx.diagnosis || '').toLowerCase().includes(q);
    const matchStatus = !filterStatus || rx.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statuses = ['draft','awaiting_review','authorized','partially_dispensed','dispensed','cancelled','superseded'];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Prescriptions</h1>
        <Link to="/doctor/prescriptions/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Prescription
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search by Rx no., patient, diagnosis…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400 shrink-0" />
          <select className="input w-48" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Rx No.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Diagnosis</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Created</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Valid Until</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /> Loading…
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No prescriptions found.</td></tr>
              ) : (
                filtered.map(rx => (
                  <tr key={rx.id} onClick={() => navigate(`/doctor/prescriptions/${rx.id}`)}
                      className="cursor-pointer hover:bg-teal-50/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{rx.prescription_no}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{rx.patient_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{rx.diagnosis || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={rx.status} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(rx.created_at)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(rx.valid_until)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
