import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, XCircle, QrCode, Clock, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../lib/api';
import { formatDate, formatDateTime, buildScheduleText } from '../../lib/utils';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import type { Prescription, PrescriptionItem, AuditEvent } from '../../types';

export default function DoctorPrescriptionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showQR, setShowQR] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [clarResponse, setClarResponse] = useState<Record<string,string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['prescription', id],
    queryFn: () => api.get(`/prescriptions/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const authorize = useMutation({
    mutationFn: () => api.post(`/prescriptions/${id}/authorize`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescription', id] }),
  });

  const cancel = useMutation({
    mutationFn: () => api.post(`/prescriptions/${id}/cancel`, { reason: cancelReason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prescription', id] }); setShowCancel(false); },
  });

  const respond = useMutation({
    mutationFn: ({ cid, response }: { cid: string; response: string }) =>
      api.post(`/clarifications/${cid}/respond`, { response }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescription', id] }),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data?.prescription) return (
    <div className="text-center py-20 text-gray-400">Prescription not found.</div>
  );

  const rx: Prescription = data.prescription;
  const items: PrescriptionItem[] = data.items || [];
  const audit: AuditEvent[] = data.audit || [];
  const clarifications = data.clarifications || [];

  const canAuthorize = ['draft','awaiting_review'].includes(rx.status) && items.length > 0;
  const canCancel    = !['cancelled','dispensed'].includes(rx.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 font-mono">{rx.prescription_no}</h1>
            <StatusBadge status={rx.status} />
          </div>
          <p className="text-gray-400 text-xs mt-0.5">Created {formatDateTime(rx.created_at)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => setShowQR(p => !p)} className="flex items-center gap-1.5">
            <QrCode size={14} /> {showQR ? 'Hide' : 'QR Code'}
          </Button>
          {canAuthorize && (
            <Button size="sm" onClick={() => authorize.mutate()} loading={authorize.isPending}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700">
              <CheckCircle size={14} /> Authorize
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" size="sm" onClick={() => setShowCancel(true)} className="flex items-center gap-1.5">
              <XCircle size={14} /> Cancel
            </Button>
          )}
        </div>
      </div>

      {/* QR */}
      {showQR && (
        <div className="card flex flex-col items-center py-6 gap-3">
          <QRCodeSVG value={JSON.stringify({ rx_id: rx.id, rx_no: rx.prescription_no, status: rx.status })} size={180} />
          <p className="text-xs text-gray-400 font-mono">{rx.prescription_no}</p>
          <p className="text-xs text-gray-400">Show this to the pharmacist to locate the prescription</p>
        </div>
      )}

      {/* Patient + Doctor info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card space-y-2">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
            <User size={15} /> Patient Information
          </div>
          <p className="font-semibold text-gray-800">{rx.patient_name}</p>
          {rx.patient_phone && <p className="text-sm text-gray-500">📞 {rx.patient_phone}</p>}
          {data.patient_profile?.date_of_birth && <p className="text-sm text-gray-500">DOB: {formatDate(data.patient_profile.date_of_birth)}</p>}
          {data.patient_profile?.blood_group && <p className="text-sm text-gray-500">Blood: {data.patient_profile.blood_group}</p>}
          {data.patient_profile?.allergies && (
            <div className="mt-1 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">⚠ Allergies</p>
              <p className="text-sm text-red-700 mt-0.5">{data.patient_profile.allergies}</p>
            </div>
          )}
        </div>

        <div className="card space-y-2">
          <p className="text-gray-500 text-sm font-medium">Prescription Details</p>
          {rx.diagnosis && <p className="text-sm text-gray-700"><span className="text-gray-400">Diagnosis:</span> {rx.diagnosis}</p>}
          {rx.notes    && <p className="text-sm text-gray-700"><span className="text-gray-400">Notes:</span> {rx.notes}</p>}
          {rx.valid_until && <p className="text-sm text-gray-700"><span className="text-gray-400">Valid Until:</span> {formatDate(rx.valid_until)}</p>}
          {rx.authorized_at && <p className="text-sm text-green-600 font-medium">✓ Authorized {formatDate(rx.authorized_at)}</p>}
        </div>
      </div>

      {/* Medicine items */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-800">Medicines ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">No medicines added yet.</p>
        ) : (
          items.map((item, idx) => (
            <div key={item.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs text-gray-400 font-medium">#{idx+1}</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {item.generic_name} {item.strength}{item.strength_unit} {item.dosage_form}
                    {item.brand_name && <span className="ml-1 text-gray-400 font-normal">({item.brand_name})</span>}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{buildScheduleText(item)}</p>
                  {item.special_instructions && (
                    <p className="text-xs text-teal-700 bg-teal-50 rounded px-2 py-1 mt-2 inline-block">{item.special_instructions}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Clarifications (pending responses) */}
      {clarifications.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800 text-red-600">⚠ Pending Clarifications</h2>
          {clarifications.filter((c: { status: string }) => c.status === 'pending').map((c: { id: string; from_name: string; message: string; created_at: string }) => (
            <div key={c.id} className="border border-orange-200 bg-orange-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-orange-800">From: {c.from_name}</p>
              <p className="text-sm text-orange-700">{c.message}</p>
              <p className="text-xs text-orange-400">{formatDateTime(c.created_at)}</p>
              <div className="flex gap-2">
                <input className="input flex-1 text-sm" placeholder="Your response…"
                  value={clarResponse[c.id] || ''}
                  onChange={e => setClarResponse(p => ({ ...p, [c.id]: e.target.value }))} />
                <Button size="sm" onClick={() => respond.mutate({ cid: c.id, response: clarResponse[c.id] || '' })}
                  loading={respond.isPending} disabled={!clarResponse[c.id]}>
                  Respond
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel modal */}
      {showCancel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-gray-900">Cancel Prescription</h3>
            <p className="text-sm text-gray-500">Provide a reason for cancellation (optional):</p>
            <textarea className="input resize-none" rows={3} value={cancelReason}
              onChange={e => setCancelReason(e.target.value)} placeholder="Reason…" />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowCancel(false)}>Back</Button>
              <Button variant="danger" className="flex-1" onClick={() => cancel.mutate()} loading={cancel.isPending}>Confirm Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Audit trail */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Clock size={16} /> Audit Trail</h2>
        <div className="space-y-2">
          {audit.map(ev => (
            <div key={ev.id} className="flex items-start gap-3 text-sm">
              <span className="w-2 h-2 rounded-full bg-teal-400 mt-1.5 shrink-0" />
              <div>
                <span className="text-gray-700 font-medium">{ev.event_type.replace(/_/g,' ')}</span>
                {ev.event_detail && <span className="text-gray-400"> — {ev.event_detail}</span>}
                <p className="text-xs text-gray-300">{formatDateTime(ev.created_at)} by {ev.actor_name} ({ev.actor_role})</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
