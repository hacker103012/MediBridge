import { useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, ShieldAlert, Package, MessageSquare, Send, Printer } from 'lucide-react';
import api from '../../lib/api';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import type { Prescription, PrescriptionItem, VerificationResult } from '../../types';

export default function PharmacistVerifyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [verification, setVerification] = useState<VerificationResult | null>(null);

  // Dispense Form State
  const [dispenseForm, setDispenseForm] = useState({
    quantity_dispensed: '',
    batch_no: 'BAT-' + Math.floor(100000 + Math.random() * 900000),
    expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    notes: '',
  });

  // Clarification Modal State
  const [showClarModal, setShowClarModal] = useState(false);
  const [clarMessage, setClarMessage] = useState('');
  const [clarSuccess, setClarSuccess] = useState('');

  // Fetch prescription details
  const { data, isLoading } = useQuery({
    queryKey: ['prescription', id],
    queryFn: () => api.get(`/prescriptions/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const rx: Prescription = data?.prescription;
  const items: PrescriptionItem[] = data?.items || [];
  const patientProfile = data?.patient_profile;

  // Auto-select first item if none selected
  const activeItemId = selectedItemId || (items[0]?.id ?? '');
  const activeItem = items.find(i => i.id === activeItemId);

  // Verification Mutation
  const verifyMutation = useMutation({
    mutationFn: (barcode: string) =>
      api.post('/medicines/verify', {
        prescription_id: id,
        prescription_item_id: activeItemId,
        barcode: barcode.trim(),
      }).then(r => r.data),
    onSuccess: (data: VerificationResult) => {
      setVerification(data);
    },
  });

  // Dispense Mutation
  const dispenseMutation = useMutation({
    mutationFn: () =>
      api.post('/medicines/dispense', {
        prescription_id: id,
        prescription_item_id: activeItemId,
        medicine_id: verification?.scanned?.id || undefined,
        quantity_dispensed: dispenseForm.quantity_dispensed || activeItem?.dose_quantity || '1 pack',
        batch_no: dispenseForm.batch_no,
        expiry_date: dispenseForm.expiry_date,
        notes: dispenseForm.notes,
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prescription', id] });
      setVerification(null);
      setBarcodeInput('');
    },
  });

  // Clarification Mutation
  const clarMutation = useMutation({
    mutationFn: () =>
      api.post('/clarifications', {
        prescription_id: id,
        message: clarMessage.trim(),
      }).then(r => r.data),
    onSuccess: () => {
      setShowClarModal(false);
      setClarMessage('');
      setClarSuccess('Clarification request submitted to the prescribing doctor.');
      setTimeout(() => setClarSuccess(''), 5000);
    },
  });

  const handleVerify = (e: FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    verifyMutation.mutate(barcodeInput);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!rx) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>Prescription not found.</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/pharmacist/find')}>
          Back to Search
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/pharmacist/find')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 font-mono">{rx.prescription_no}</h1>
            <StatusBadge status={rx.status} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Patient: <span className="font-medium text-gray-800">{rx.patient_name}</span> • Doctor: Dr. {rx.doctor_name}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {['authorized', 'partially_dispensed', 'dispensed'].includes(rx.status) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/pharmacist/prescriptions/${rx.id}/print`)}
              className="flex items-center gap-1.5 text-teal-700 border-teal-300 hover:bg-teal-50 font-medium"
            >
              <Printer size={14} /> Generate Patient Instruction Sheet
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowClarModal(true)}
            className="flex items-center gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50"
          >
            <MessageSquare size={14} /> Query Doctor
          </Button>
        </div>
      </div>

      {clarSuccess && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 size={16} /> {clarSuccess}
        </div>
      )}

      {/* Patient Allergy Alert Banner */}
      {patientProfile?.allergies && patientProfile.allergies !== 'None known' && (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl flex items-start gap-3">
          <ShieldAlert size={22} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-800 text-sm uppercase tracking-wide">
              Critical Patient Allergy Alert
            </h3>
            <p className="text-sm text-red-700 mt-0.5">
              The patient has a documented allergy to: <span className="font-semibold">{patientProfile.allergies}</span>.
              Verify that the dispensed medication does not trigger cross-reactivity.
            </p>
          </div>
        </div>
      )}

      {/* Prescription Item Selector */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-800 text-sm">Select Prescribed Medication to Verify:</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map(it => {
            const isSelected = it.id === activeItemId;
            return (
              <div
                key={it.id}
                onClick={() => {
                  setSelectedItemId(it.id);
                  setVerification(null);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">
                      {it.generic_name} {it.strength}{it.strength_unit}
                    </p>
                    {it.brand_name && (
                      <p className="text-xs text-gray-500">Brand: {it.brand_name}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1 capitalize">
                      {it.dosage_form} • {it.dose_quantity} • {it.frequency}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="text-xs bg-teal-600 text-white font-semibold px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Barcode Scanner / Manual Input Box */}
      {activeItem && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm">
            Scan Medication Barcode for: <span className="text-teal-700 font-bold">{activeItem.generic_name} {activeItem.strength}{activeItem.strength_unit}</span>
          </h2>

          <form onSubmit={handleVerify} className="flex gap-2">
            <input
              className="input flex-1 font-mono text-base"
              placeholder="Scan or enter medication barcode (e.g. 8901234567890)…"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              autoFocus
            />
            <Button type="submit" loading={verifyMutation.isPending}>
              Verify Barcode
            </Button>
          </form>

          {/* Quick Demo Barcodes */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Demo Barcodes to Test Verification Logic:
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setBarcodeInput('8901234567890'); verifyMutation.mutate('8901234567890'); }}
                className="text-xs bg-white border border-gray-200 hover:border-teal-500 px-2.5 py-1.5 rounded-lg text-gray-700"
              >
                8901234567890 (Amoxicillin 500mg) → <span className="text-green-600 font-bold">MATCH</span>
              </button>
              <button
                type="button"
                onClick={() => { setBarcodeInput('8901234567895'); verifyMutation.mutate('8901234567895'); }}
                className="text-xs bg-white border border-gray-200 hover:border-red-500 px-2.5 py-1.5 rounded-lg text-gray-700"
              >
                8901234567895 (Amoxicillin 250mg) → <span className="text-red-600 font-bold">MISMATCH (Dose)</span>
              </button>
              <button
                type="button"
                onClick={() => { setBarcodeInput('8901234567891'); verifyMutation.mutate('8901234567891'); }}
                className="text-xs bg-white border border-gray-200 hover:border-red-500 px-2.5 py-1.5 rounded-lg text-gray-700"
              >
                8901234567891 (Azithromycin 250mg) → <span className="text-red-600 font-bold">MISMATCH (Drug)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Result Display */}
      {verification && (
        <div className={`p-6 rounded-2xl border-2 space-y-4 ${
          verification.result === 'match'
            ? 'bg-green-50 border-green-500 text-green-900'
            : verification.result === 'amber'
            ? 'bg-amber-50 border-amber-500 text-amber-900'
            : 'bg-red-50 border-red-500 text-red-900'
        }`}>
          <div className="flex items-center gap-3">
            {verification.result === 'match' ? (
              <CheckCircle2 size={32} className="text-green-600" />
            ) : verification.result === 'amber' ? (
              <AlertTriangle size={32} className="text-amber-600" />
            ) : (
              <XCircle size={32} className="text-red-600" />
            )}
            <div>
              <h3 className="text-lg font-bold">
                {verification.result === 'match'
                  ? 'VERIFIED: Product Matches Prescription'
                  : verification.result === 'amber'
                  ? 'CAUTION: Pharmacist Attention Required'
                  : 'DISCREPANCY DETECTED: DO NOT DISPENSE'}
              </h3>
              <p className="text-sm mt-0.5">{verification.message}</p>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-gray-800 text-sm grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Prescribed by Doctor</p>
              <p className="font-bold text-gray-900 mt-1">{verification.prescribed?.generic_name}</p>
              <p className="text-xs text-gray-600">Strength: {verification.prescribed?.strength} {verification.prescribed?.strength_unit}</p>
              <p className="text-xs text-gray-600 capitalize">Form: {verification.prescribed?.dosage_form}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Scanned Physical Product</p>
              <p className="font-bold text-gray-900 mt-1">{verification.scanned?.generic_name || 'Unknown / Not Found'}</p>
              <p className="text-xs text-gray-600">Strength: {verification.scanned?.strength ? `${verification.scanned.strength} ${verification.scanned.strength_unit}` : '—'}</p>
              <p className="text-xs text-gray-600 capitalize">Form: {verification.scanned?.dosage_form || '—'}</p>
              {verification.scanned?.brand_name && (
                <p className="text-xs text-gray-500">Brand: {verification.scanned.brand_name} ({verification.scanned.manufacturer})</p>
              )}
            </div>
          </div>

          {/* Dispense Trigger on Match */}
          {verification.result === 'match' && (
            <div className="pt-2 border-t border-green-200 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 grid grid-cols-2 gap-2 w-full">
                <input
                  className="input text-xs"
                  placeholder="Batch #"
                  value={dispenseForm.batch_no}
                  onChange={e => setDispenseForm(p => ({ ...p, batch_no: e.target.value }))}
                />
                <input
                  className="input text-xs"
                  type="date"
                  placeholder="Expiry Date"
                  value={dispenseForm.expiry_date}
                  onChange={e => setDispenseForm(p => ({ ...p, expiry_date: e.target.value }))}
                />
              </div>
              <Button
                onClick={() => dispenseMutation.mutate()}
                loading={dispenseMutation.isPending}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                <Package size={16} /> Confirm Dispense
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Clarification Request Modal */}
      {showClarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">Send Query to Dr. {rx.doctor_name}</h3>
            <p className="text-sm text-gray-500">
              Prescription {rx.prescription_no} will be referenced automatically. Dr. {rx.doctor_name} will be notified immediately.
            </p>
            <textarea
              className="input resize-none text-sm"
              rows={4}
              placeholder="e.g. Patient has penicillin allergy noted in file. Confirming Amoxicillin is still intended…"
              value={clarMessage}
              onChange={e => setClarMessage(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowClarModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => clarMutation.mutate()}
                loading={clarMutation.isPending}
                disabled={!clarMessage.trim()}
                className="flex items-center gap-2"
              >
                <Send size={14} /> Submit Query
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
