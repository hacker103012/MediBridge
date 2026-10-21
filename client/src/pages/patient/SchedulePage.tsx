import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle2, Clock, Sun, Sunset, Moon, Coffee, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { buildLocalizedInstruction, buildScheduleText } from '../../lib/utils';
import type { Prescription, PrescriptionItem, MedicationSchedule } from '../../types';

interface ScheduledItem extends PrescriptionItem {
  prescription_no: string;
  doctor_name?: string;
}

export default function PatientSchedulePage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const todayIso = new Date().toISOString().split('T')[0];

  // 1. Fetch patient prescriptions
  const { data: rxData, isLoading: rxLoading } = useQuery({
    queryKey: ['prescriptions', 'patient'],
    queryFn: () => api.get('/prescriptions').then(r => r.data),
    enabled: !!user?.id,
  });

  const prescriptions: Prescription[] = rxData?.prescriptions || [];
  const activePrescriptions = prescriptions.filter(p =>
    ['authorized', 'partially_dispensed', 'dispensed'].includes(p.status)
  );

  // 2. Fetch full details of each active prescription to get medicine items
  const { data: detailedRxList, isLoading: detailsLoading } = useQuery({
    queryKey: ['prescriptions', 'patient', 'detailed', activePrescriptions.map(p => p.id).join(',')],
    queryFn: async () => {
      const details = await Promise.all(
        activePrescriptions.map(p => api.get(`/prescriptions/${p.id}`).then(r => r.data))
      );
      return details;
    },
    enabled: activePrescriptions.length > 0,
  });

  // 3. Fetch persistent medication schedule status for today from backend
  const { data: scheduleData, isLoading: scheduleLoading } = useQuery({
    queryKey: ['medicationSchedule', user?.id, todayIso],
    queryFn: () => api.get(`/patients/${user?.id}/schedule?date=${todayIso}`).then(r => r.data),
    enabled: !!user?.id,
  });

  // Map of persisted schedule statuses: key = `${prescription_item_id}-${slot}`
  const persistedSchedules: MedicationSchedule[] = scheduleData?.schedules || [];
  const statusMap = new Map<string, string>();
  persistedSchedules.forEach(s => {
    statusMap.set(`${s.prescription_item_id}-${s.slot}`, s.status);
  });

  // 4. Mutation to persist status update in backend database
  const toggleMutation = useMutation({
    mutationFn: async ({
      itemId,
      slot,
      nextStatus,
    }: {
      itemId: string;
      slot: string;
      nextStatus: 'taken' | 'pending';
    }) => {
      return api.post(`/patients/${user?.id}/schedule`, {
        prescription_item_id: itemId,
        slot,
        status: nextStatus,
        schedule_date: todayIso,
      });
    },
    onMutate: ({ itemId, slot }) => {
      setPendingKey(`${itemId}-${slot}`);
      setUpdateError(null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicationSchedule', user?.id, todayIso] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setUpdateError(msg || 'Failed to update medication status. Please check your connection and try again.');
    },
    onSettled: () => {
      setPendingKey(null);
    },
  });

  // Extract all scheduled items
  const allItems: ScheduledItem[] = [];
  (detailedRxList || []).forEach(d => {
    const rx = d.prescription;
    const items: PrescriptionItem[] = d.items || [];
    items.forEach(it => {
      allItems.push({
        ...it,
        prescription_no: rx.prescription_no,
        doctor_name: rx.doctor_name,
      });
    });
  });

  const slots = [
    { key: 'morning', label: 'Morning', icon: <Sun size={18} className="text-amber-500" />, time: '08:00 AM' },
    { key: 'afternoon', label: 'Afternoon', icon: <Coffee size={18} className="text-orange-500" />, time: '01:00 PM' },
    { key: 'evening', label: 'Evening', icon: <Sunset size={18} className="text-indigo-500" />, time: '06:00 PM' },
    { key: 'night', label: 'Night', icon: <Moon size={18} className="text-blue-500" />, time: '09:00 PM' },
  ] as const;

  const handleToggle = (itemId: string, slot: string) => {
    if (toggleMutation.isPending && pendingKey === `${itemId}-${slot}`) return;
    const currentStatus = statusMap.get(`${itemId}-${slot}`) || 'pending';
    const nextStatus = currentStatus === 'taken' ? 'pending' : 'taken';
    toggleMutation.mutate({ itemId, slot, nextStatus });
  };

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const userLang = user?.language || 'en';
  const isPageLoading = rxLoading || (activePrescriptions.length > 0 && detailsLoading) || scheduleLoading;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={22} className="text-teal-600" /> Medication Schedule
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{todayStr}</p>
        </div>
      </div>

      {/* Error alert banner */}
      {updateError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0 text-red-600" />
            <div>
              <p className="font-semibold">Update Failed</p>
              <p className="text-xs text-red-600 mt-0.5">{updateError}</p>
            </div>
          </div>
          <button
            onClick={() => setUpdateError(null)}
            className="text-red-400 hover:text-red-700 text-xs font-bold px-2 py-1"
            title="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {isPageLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : allItems.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Clock size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-base font-medium text-gray-600">No active medications scheduled</p>
          <p className="text-xs text-gray-400 mt-1">
            Once a doctor prescribes medications and authorizes them, your daily doses will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {slots.map(slot => {
            const slotItems = allItems.filter(item => item[slot.key] === 1);
            if (slotItems.length === 0) return null;

            return (
              <div key={slot.key} className="card space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    {slot.icon}
                    <h2 className="font-bold text-gray-800 text-base">{slot.label}</h2>
                  </div>
                  <span className="text-xs font-mono text-gray-400">{slot.time}</span>
                </div>

                <div className="space-y-2">
                  {slotItems.map(item => {
                    const uniqueKey = `${item.id}-${slot.key}`;
                    const currentStatus = statusMap.get(uniqueKey) || 'pending';
                    const isTaken = currentStatus === 'taken';
                    const isUpdating = pendingKey === uniqueKey;

                    return (
                      <div
                        key={uniqueKey}
                        onClick={() => handleToggle(item.id, slot.key)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isTaken
                            ? 'bg-green-50/70 border-green-200'
                            : 'bg-gray-50 hover:bg-teal-50/40 border-gray-100'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`font-semibold text-sm ${
                                isTaken ? 'line-through text-gray-500' : 'text-gray-900'
                              }`}
                            >
                              {item.generic_name} {item.strength}
                              {item.strength_unit}
                              {item.brand_name && (
                                <span className="font-normal text-xs text-gray-500 ml-1">
                                  ({item.brand_name})
                                </span>
                              )}
                            </p>
                            <span className="text-xs font-mono text-gray-400">
                              ({item.prescription_no})
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {userLang !== 'en'
                              ? buildLocalizedInstruction(item, userLang)
                              : buildScheduleText(item)}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={isUpdating}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isTaken
                              ? 'text-green-600 bg-green-100'
                              : 'text-gray-400 hover:text-teal-600'
                          }`}
                          aria-label={isTaken ? 'Mark as not taken' : 'Mark as taken'}
                        >
                          {isUpdating ? (
                            <Loader2 size={20} className="animate-spin text-teal-600" />
                          ) : (
                            <CheckCircle2 size={20} />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
