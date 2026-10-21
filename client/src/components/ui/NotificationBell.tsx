import { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatDateTime } from '../../lib/utils';
import type { Notification } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 30_000,
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // SSE subscription for real-time
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('mb_access_token');
    if (!token) return;
    const es = new EventSource(`/api/sse?token=${token}`);
    es.onmessage = () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    };
    return () => es.close();
  }, [user, qc]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const notifications: Notification[] = data?.notifications || [];
  const unread: number = data?.unread_count || 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="relative p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center leading-none font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} /> All read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${n.read === 0 ? 'bg-teal-50/40' : ''}`}
                  onClick={() => { if (n.read === 0) markRead.mutate(n.id); }}
                >
                  <div className="flex items-start gap-2">
                    {n.read === 0 && (
                      <span className="w-2 h-2 bg-teal-500 rounded-full mt-1.5 shrink-0" />
                    )}
                    <div className={n.read === 0 ? '' : 'ml-4'}>
                      <p className="text-sm font-medium text-gray-800 leading-snug">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.body}</p>
                      <p className="text-xs text-gray-300 mt-1">{formatDateTime(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
