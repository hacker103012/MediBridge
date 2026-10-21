import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import api from '../../lib/api';
import { formatDate } from '../../lib/utils';
import StatusBadge from '../../components/ui/StatusBadge';
import type { Prescription } from '../../types';

export default function PatientPrescriptionsPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['prescriptions', 'patient'],
    queryFn: () => api.get('/prescriptions').then(r => r.data),
  });

  const prescriptions: Prescription[] = data?.prescriptions || [];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">My Prescriptions</h1>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <FileText size={40} className="mx-auto mb-2 opacity-30" />
          <p>No prescriptions yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map(rx => (
            <div key={rx.id}
              className="card cursor-pointer hover:border-teal-200 border border-transparent transition-colors"
              onClick={() => navigate(`/patient/prescriptions/${rx.id}`)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-gray-400">{rx.prescription_no}</span>
                    <StatusBadge status={rx.status} />
                  </div>
                  <p className="font-semibold text-gray-800 mt-1">Dr. {rx.doctor_name}</p>
                  {rx.diagnosis && <p className="text-sm text-gray-500 mt-0.5 truncate">{rx.diagnosis}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">{formatDate(rx.created_at)}</p>
                  {rx.valid_until && (
                    <p className="text-xs text-gray-400 mt-0.5">Valid: {formatDate(rx.valid_until)}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
