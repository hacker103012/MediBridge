import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, Users, MessageSquare, Plus, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/utils';
import StatusBadge from '../../components/ui/StatusBadge';
import type { Prescription } from '../../types';

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const { data: rxData, isLoading } = useQuery({
    queryKey: ['prescriptions', 'doctor'],
    queryFn: () => api.get('/prescriptions').then(r => r.data),
  });

  const { data: clarData } = useQuery({
    queryKey: ['clarifications'],
    queryFn: () => api.get('/clarifications').then(r => r.data),
  });

  const { data: patData } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients').then(r => r.data),
  });

  const prescriptions: Prescription[] = rxData?.prescriptions || [];
  const pending   = prescriptions.filter(p => ['draft','awaiting_review'].includes(p.status)).length;
  const authorized = prescriptions.filter(p => p.status === 'authorized').length;
  const pendingClar = (clarData?.clarifications || []).filter((c: { status: string }) => c.status === 'pending').length;

  const recent = [...prescriptions].slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Good morning, {user?.full_name?.split(' ')[0]}!</h1>
          <p className="text-gray-500 text-sm mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <Link to="/doctor/prescriptions/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Prescription
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Prescriptions" value={prescriptions.length} icon={<FileText size={22} className="text-teal-600" />} color="bg-teal-50" />
        <StatCard label="Pending / Draft" value={pending} icon={<Clock size={22} className="text-yellow-600" />} color="bg-yellow-50" />
        <StatCard label="Authorized" value={authorized} icon={<CheckCircle size={22} className="text-green-600" />} color="bg-green-50" />
        <StatCard label="Pending Clarifications" value={pendingClar} icon={<AlertTriangle size={22} className="text-orange-600" />} color="bg-orange-50" />
      </div>

      {/* Recent prescriptions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Recent Prescriptions</h2>
          <Link to="/doctor/prescriptions" className="text-sm text-teal-600 hover:underline">View all</Link>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-400 py-6 justify-center">
            <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /> Loading…
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileText size={40} className="mx-auto mb-2 opacity-30" />
            <p>No prescriptions yet.</p>
            <Link to="/doctor/prescriptions/new" className="text-teal-600 text-sm mt-1 inline-block hover:underline">Create your first prescription →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Rx No.</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Patient</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent.map(rx => (
                  <tr key={rx.id} className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/doctor/prescriptions/${rx.id}`)}>
                    <td className="py-3 px-3 font-mono text-xs text-gray-700">{rx.prescription_no}</td>
                    <td className="py-3 px-3 text-gray-700">{rx.patient_name || '—'}</td>
                    <td className="py-3 px-3"><StatusBadge status={rx.status} /></td>
                    <td className="py-3 px-3 text-gray-400">{formatDate(rx.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/doctor/patients" className="card flex items-center gap-3 hover:border-teal-200 hover:bg-teal-50/30 transition-colors border border-transparent">
          <Users className="text-teal-600" size={24} />
          <div>
            <p className="font-medium text-gray-800">My Patients</p>
            <p className="text-xs text-gray-400">{patData?.patients?.length ?? 0} under your care</p>
          </div>
        </Link>
        <Link to="/doctor/clarifications" className="card flex items-center gap-3 hover:border-orange-200 hover:bg-orange-50/30 transition-colors border border-transparent">
          <MessageSquare className="text-orange-600" size={24} />
          <div>
            <p className="font-medium text-gray-800">Clarifications</p>
            <p className="text-xs text-gray-400">{pendingClar} pending response{pendingClar !== 1 ? 's' : ''}</p>
          </div>
        </Link>
        <Link to="/doctor/profile" className="card flex items-center gap-3 hover:border-gray-200 hover:bg-gray-50/60 transition-colors border border-transparent">
          <FileText className="text-gray-400" size={24} />
          <div>
            <p className="font-medium text-gray-800">My Profile</p>
            <p className="text-xs text-gray-400">Update credentials</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
