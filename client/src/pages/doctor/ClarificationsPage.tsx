import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, CheckCircle, Clock } from 'lucide-react';
import api from '../../lib/api';
import { formatDateTime } from '../../lib/utils';
import Button from '../../components/ui/Button';

interface Clarification {
  id: string;
  prescription_id: string;
  prescription_no?: string;
  from_name?: string;
  message: string;
  status: 'pending' | 'responded' | 'closed';
  response?: string;
  responded_at?: string;
  created_at: string;
}

export default function DoctorClarificationsPage() {
  const qc = useQueryClient();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | 'pending' | 'responded'>('pending');

  const { data, isLoading } = useQuery({
    queryKey: ['clarifications', 'doctor'],
    queryFn: () => api.get('/clarifications').then(r => r.data),
    refetchInterval: 30_000,
  });

  const respond = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      api.post(`/clarifications/${id}/respond`, { response }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clarifications', 'doctor'] });
      setResponses({});
    },
  });

  const clarifications: Clarification[] = data?.clarifications || [];
  const filtered = filter === 'all' ? clarifications : clarifications.filter(c => c.status === filter);

  const pending = clarifications.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clarification Requests</h1>
          {pending > 0 && <p className="text-sm text-orange-600 mt-0.5">{pending} pending response{pending !== 1 ? 's' : ''}</p>}
        </div>
        <div className="flex gap-2">
          {(['pending','responded','all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <MessageSquare size={40} className="mx-auto mb-2 opacity-30" />
          <p>No clarification requests {filter !== 'all' ? `with status "${filter}"` : ''}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(c => (
            <div key={c.id} className={`card border ${c.status === 'pending' ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-gray-400">{c.prescription_no || c.prescription_id.slice(0,8)}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {c.status === 'pending' ? <span className="flex items-center gap-1"><Clock size={10} /> Pending</span> : <span className="flex items-center gap-1"><CheckCircle size={10} /> Responded</span>}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">From: <span className="font-medium text-gray-600">{c.from_name || 'Pharmacist'}</span> · {formatDateTime(c.created_at)}</p>
                </div>
              </div>

              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-100">
                <p className="text-sm text-gray-700 font-medium">Query:</p>
                <p className="text-sm text-gray-600 mt-1">{c.message}</p>
              </div>

              {c.status === 'responded' && c.response && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-sm text-green-700 font-medium">Your response:</p>
                  <p className="text-sm text-green-600 mt-1">{c.response}</p>
                  <p className="text-xs text-green-300 mt-1">{formatDateTime(c.responded_at)}</p>
                </div>
              )}

              {c.status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <input
                    className="input flex-1 text-sm"
                    placeholder="Type your response to the pharmacist…"
                    value={responses[c.id] || ''}
                    onChange={e => setResponses(p => ({ ...p, [c.id]: e.target.value }))}
                  />
                  <Button size="sm"
                    onClick={() => respond.mutate({ id: c.id, response: responses[c.id] || '' })}
                    loading={respond.isPending}
                    disabled={!responses[c.id]?.trim()}>
                    Send
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
