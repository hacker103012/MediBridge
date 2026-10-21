import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, FileText, Activity, Clock } from 'lucide-react';
import api from '../../lib/api';
import { formatDateTime } from '../../lib/utils';
import type { User, Prescription, AuditEvent } from '../../types';

export default function AdminDashboardPage() {
  const { data: usersData } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => api.get('/profiles/admin/users').then(r => r.data),
  });

  const { data: rxData } = useQuery({
    queryKey: ['prescriptions', 'admin'],
    queryFn: () => api.get('/prescriptions').then(r => r.data),
  });

  const { data: auditData } = useQuery({
    queryKey: ['adminAudit', 10],
    queryFn: () => api.get('/profiles/admin/audit?limit=10').then(r => r.data),
  });

  const users: User[] = usersData?.users || [];
  const prescriptions: Prescription[] = rxData?.prescriptions || [];
  const auditEvents: (AuditEvent & { prescription_no?: string })[] = auditData?.events || [];

  const unverifiedPractitioners = users.filter(
    u => (u.role === 'doctor' || u.role === 'pharmacist') && !u.is_verified
  ).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Platform Administration</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          System oversight, verification authority, and immutable audit logs.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Users size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            <p className="text-xs text-gray-500">Registered Users</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
            <FileText size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{prescriptions.length}</p>
            <p className="text-xs text-gray-500">Total Prescriptions</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{unverifiedPractitioners}</p>
            <p className="text-xs text-gray-500">Pending Verification</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Activity size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{auditEvents.length}</p>
            <p className="text-xs text-gray-500">Recent Audit Events</p>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/admin/users"
          className="card border border-transparent hover:border-teal-300 transition-all flex items-center justify-between"
        >
          <div>
            <h3 className="font-bold text-gray-900 text-base">User Verification Management</h3>
            <p className="text-xs text-gray-500 mt-1">
              Verify credentials, review registrations, and activate medical practitioners.
            </p>
          </div>
          <span className="text-teal-600 text-sm font-semibold hover:underline">Manage Users →</span>
        </Link>

        <Link
          to="/admin/prescriptions"
          className="card border border-transparent hover:border-teal-300 transition-all flex items-center justify-between"
        >
          <div>
            <h3 className="font-bold text-gray-900 text-base">Prescription & Audit Log Oversight</h3>
            <p className="text-xs text-gray-500 mt-1">
              Inspect immutable ledger entries across all prescriptions and dispensing events.
            </p>
          </div>
          <span className="text-teal-600 text-sm font-semibold hover:underline">Inspect Prescriptions →</span>
        </Link>
      </div>

      {/* Recent System Audit Events */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Activity size={18} className="text-teal-600" /> Recent Platform Activity
        </h2>

        {auditEvents.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No audit records recorded yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {auditEvents.map(ev => (
              <div key={ev.id} className="py-2.5 flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-teal-500 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium">
                    <span className="capitalize">{ev.event_type.replace(/_/g, ' ')}</span>
                    {ev.prescription_no && (
                      <span className="text-xs font-mono text-gray-500 ml-2">({ev.prescription_no})</span>
                    )}
                  </p>
                  {ev.event_detail && (
                    <p className="text-xs text-gray-500">{ev.event_detail}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    By <span className="font-medium text-gray-600">{ev.actor_name}</span> ({ev.actor_role}) • {formatDateTime(ev.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
