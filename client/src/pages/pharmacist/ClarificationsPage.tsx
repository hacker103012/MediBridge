import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatDateTime } from '../../lib/utils';
import type { ClarificationRequest } from '../../types';

export default function PharmacistClarificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'pending' | 'responded'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['clarifications', 'pharmacist'],
    queryFn: () => api.get('/clarifications').then(r => r.data),
    refetchInterval: 20_000,
  });

  const clarifications: ClarificationRequest[] = data?.clarifications || [];
  const filtered = filter === 'all' ? clarifications : clarifications.filter(c => c.status === filter);
  const pendingCount = clarifications.filter(c => c.status === 'pending').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clarification Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Queries and discrepancy notifications sent to prescribing doctors.
          </p>
        </div>

        <div className="flex gap-2">
          {(['all', 'pending', 'responded'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-white/20 rounded-full text-xs font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p>No clarification queries found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(c => (
            <div
              key={c.id}
              className={`card border transition-all ${
                c.status === 'pending'
                  ? 'border-orange-200 bg-orange-50/20'
                  : 'border-green-200 bg-green-50/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-gray-900">
                      {c.prescription_no || c.prescription_id}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        c.status === 'pending'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {c.status === 'pending' ? <Clock size={12} /> : <CheckCircle size={12} />}
                      {c.status === 'pending' ? 'Pending Doctor Response' : 'Doctor Responded'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Sent to: <span className="font-medium text-gray-800">Dr. {c.to_name || 'Prescriber'}</span> • {formatDateTime(c.created_at)}
                  </p>
                </div>

                <button
                  onClick={() => navigate(`/pharmacist/verify/${c.prescription_id}`)}
                  className="text-xs font-medium text-purple-700 hover:text-purple-900 flex items-center gap-1 hover:underline"
                >
                  View Rx <ArrowRight size={12} />
                </button>
              </div>

              {/* Message from pharmacist */}
              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Your Query</p>
                <p className="text-sm text-gray-800 mt-0.5">{c.message}</p>
              </div>

              {/* Response from doctor */}
              {c.status === 'responded' && c.response && (
                <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Doctor Response</p>
                  <p className="text-sm text-green-900 font-medium mt-0.5">{c.response}</p>
                  {c.responded_at && (
                    <p className="text-xs text-green-600 mt-1">{formatDateTime(c.responded_at)}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
