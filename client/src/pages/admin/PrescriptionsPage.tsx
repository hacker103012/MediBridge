import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Shield } from 'lucide-react';
import api from '../../lib/api';
import { formatDate, formatDateTime } from '../../lib/utils';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import type { Prescription, AuditEvent } from '../../types';

export default function AdminPrescriptionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);

  const { data: rxData, isLoading: rxLoading } = useQuery({
    queryKey: ['prescriptions', 'admin'],
    queryFn: () => api.get('/prescriptions').then(r => r.data),
  });

  const { data: auditData } = useQuery({
    queryKey: ['adminAudit', selectedRx?.id],
    queryFn: () => api.get(`/profiles/admin/audit?prescription_id=${selectedRx?.id}`).then(r => r.data),
    enabled: !!selectedRx?.id,
  });

  const prescriptions: Prescription[] = rxData?.prescriptions || [];
  const auditEvents: AuditEvent[] = auditData?.events || [];

  const filtered = prescriptions.filter(rx => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      rx.prescription_no.toLowerCase().includes(q) ||
      (rx.patient_name && rx.patient_name.toLowerCase().includes(q)) ||
      (rx.doctor_name && rx.doctor_name.toLowerCase().includes(q));
    const matchesStatus = !statusFilter || rx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const allStatuses = [
    'draft',
    'awaiting_review',
    'authorized',
    'partially_dispensed',
    'dispensed',
    'cancelled',
    'superseded',
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Prescription & Audit Log Oversight</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          View all prescriptions across the platform and review immutable event audit trails.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by Rx number, patient, or doctor…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400 shrink-0" />
          <select
            className="input w-48 capitalize"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {allStatuses.map(s => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Prescriptions Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase">
                <th className="px-4 py-3">Prescription #</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rxLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      Loading prescriptions…
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    No prescriptions found.
                  </td>
                </tr>
              ) : (
                filtered.map(rx => (
                  <tr
                    key={rx.id}
                    onClick={() => setSelectedRx(rx)}
                    className="hover:bg-teal-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-gray-900">
                      {rx.prescription_no}
                    </td>

                    <td className="px-4 py-3 font-medium text-gray-800">
                      {rx.patient_name || '—'}
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      Dr. {rx.doctor_name || '—'}
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={rx.status} />
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatDate(rx.created_at)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-semibold text-teal-600 hover:underline">
                        View Audit →
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Modal */}
      {selectedRx && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedRx(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-lg font-mono">
                  {selectedRx.prescription_no}
                </h3>
                <p className="text-xs text-gray-500">
                  Patient: {selectedRx.patient_name} • Doctor: Dr. {selectedRx.doctor_name}
                </p>
              </div>
              <StatusBadge status={selectedRx.status} />
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Shield size={16} className="text-teal-600" /> Immutable Event Audit Trail
              </h4>

              {auditEvents.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">No specific audit logs found.</p>
              ) : (
                <div className="space-y-2 border-l-2 border-teal-200 pl-4 ml-2">
                  {auditEvents.map(ev => (
                    <div key={ev.id} className="relative pb-3">
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-teal-500 ring-4 ring-white" />
                      <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                        {ev.event_type.replace(/_/g, ' ')}
                      </p>
                      {ev.event_detail && (
                        <p className="text-xs text-gray-600 mt-0.5">{ev.event_detail}</p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1">
                        By {ev.actor_name} ({ev.actor_role}) • {formatDateTime(ev.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedRx(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
