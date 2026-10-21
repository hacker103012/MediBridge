import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldAlert, CheckCircle } from 'lucide-react';
import api from '../../lib/api';
import { formatDate } from '../../lib/utils';
import Button from '../../components/ui/Button';
import type { User } from '../../types';

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => api.get('/profiles/admin/users').then(r => r.data),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ userId, role, status }: { userId: string; role: string; status: 'verified' | 'rejected' }) =>
      api.post('/profiles/admin/verify', {
        user_id: userId,
        role,
        status,
        note: `Reviewed and ${status} by administrator.`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });

  const users: User[] = data?.users || [];

  const filtered = users.filter(u => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">User Management & Verification</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Review accounts, verify medical licenses, and manage platform permissions.
        </p>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, email, or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input w-44 capitalize"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="doctor">Doctors</option>
          <option value="pharmacist">Pharmacists</option>
          <option value="patient">Patients</option>
          <option value="admin">Administrators</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Verification Status</th>
                <th className="px-4 py-3">Registered</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      Loading users…
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{u.full_name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full capitalize bg-gray-100 text-gray-700">
                        {u.role}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-600">
                      {u.phone || '—'}
                    </td>

                    <td className="px-4 py-3">
                      {u.is_verified ? (
                        <span className="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
                          <CheckCircle size={12} /> Verified
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
                          <ShieldAlert size={12} /> Unverified
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatDate(u.created_at)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {(u.role === 'doctor' || u.role === 'pharmacist') && (
                        <div className="flex justify-end gap-1.5">
                          {!u.is_verified ? (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-xs py-1 px-2.5"
                              onClick={() =>
                                verifyMutation.mutate({
                                  userId: u.id,
                                  role: u.role,
                                  status: 'verified',
                                })
                              }
                              loading={verifyMutation.isPending}
                            >
                              Approve
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 text-xs py-1 px-2.5"
                              onClick={() =>
                                verifyMutation.mutate({
                                  userId: u.id,
                                  role: u.role,
                                  status: 'rejected',
                                })
                              }
                              loading={verifyMutation.isPending}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
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
