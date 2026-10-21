import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, Calendar, CheckCircle, Clock } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/utils';
import StatusBadge from '../../components/ui/StatusBadge';
import type { Prescription } from '../../types';

export default function PatientDashboard() {
  const { user } = useAuth();

  const { data: rxData } = useQuery({
    queryKey: ['prescriptions', 'patient'],
    queryFn: () => api.get('/prescriptions').then(r => r.data),
  });

  const prescriptions: Prescription[] = rxData?.prescriptions || [];
  const active = prescriptions.filter(p => ['authorized','partially_dispensed'].includes(p.status));
  const recent = prescriptions.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-5 text-white">
        <h1 className="text-xl font-bold">Hello, {user?.full_name?.split(' ')[0]}! 👋</h1>
        <p className="text-teal-100 text-sm mt-1">
          {active.length > 0
            ? `You have ${active.length} active prescription${active.length !== 1 ? 's' : ''} ready to collect.`
            : 'No active prescriptions at the moment.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-teal-600">{prescriptions.length}</p>
          <p className="text-xs text-gray-400 mt-1">Total Rx</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-green-600">{active.length}</p>
          <p className="text-xs text-gray-400 mt-1">Active</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-blue-600">{prescriptions.filter(p => p.status === 'dispensed').length}</p>
          <p className="text-xs text-gray-400 mt-1">Dispensed</p>
        </div>
      </div>

      {/* Active prescriptions */}
      {active.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-600" /> Ready to Collect
          </h2>
          {active.map(rx => (
            <Link key={rx.id} to={`/patient/prescriptions/${rx.id}`}
              className="block p-4 border border-green-100 bg-green-50/40 rounded-xl hover:bg-green-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs text-gray-400">{rx.prescription_no}</p>
                  <p className="font-semibold text-gray-800 mt-0.5">Dr. {rx.doctor_name}</p>
                  {rx.diagnosis && <p className="text-xs text-gray-500 mt-0.5">{rx.diagnosis}</p>}
                </div>
                <div className="text-right">
                  <StatusBadge status={rx.status} />
                  {rx.valid_until && (
                    <p className="text-xs text-gray-400 mt-1">Valid until {formatDate(rx.valid_until)}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Recent prescriptions */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <FileText size={16} className="text-gray-400" /> Recent Prescriptions
          </h2>
          <Link to="/patient/prescriptions" className="text-sm text-teal-600 hover:underline">View all</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No prescriptions yet.</p>
        ) : (
          recent.map(rx => (
            <Link key={rx.id} to={`/patient/prescriptions/${rx.id}`}
              className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-700">{rx.prescription_no}</p>
                <p className="text-xs text-gray-400">Dr. {rx.doctor_name} · {formatDate(rx.created_at)}</p>
              </div>
              <StatusBadge status={rx.status} />
            </Link>
          ))
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/patient/schedule" className="card flex items-center gap-3 hover:border-teal-200 border border-transparent transition-colors">
          <Calendar className="text-teal-600" size={22} />
          <div>
            <p className="font-medium text-gray-800 text-sm">Medication Schedule</p>
            <p className="text-xs text-gray-400">Track your doses</p>
          </div>
        </Link>
        <Link to="/patient/profile" className="card flex items-center gap-3 hover:border-gray-200 border border-transparent transition-colors">
          <Clock className="text-gray-400" size={22} />
          <div>
            <p className="font-medium text-gray-800 text-sm">My Profile</p>
            <p className="text-xs text-gray-400">Update your info</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
