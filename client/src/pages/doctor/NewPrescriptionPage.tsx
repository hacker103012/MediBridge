import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import api from '../../lib/api';
import MedicineItemForm from '../../components/ui/MedicineItemForm';
import Button from '../../components/ui/Button';
import type { PrescriptionItem } from '../../types';

type ItemDraft = Omit<PrescriptionItem, 'id' | 'prescription_id' | 'created_at' | 'sort_order'>;

export default function NewPrescriptionPage() {
  const navigate = useNavigate();

  const [patientId,  setPatientId]  = useState('');
  const [diagnosis,  setDiagnosis]  = useState('');
  const [notes,      setNotes]      = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [items,      setItems]      = useState<ItemDraft[]>([]);
  const [error,      setError]      = useState('');
  const [autoAuth,   setAutoAuth]   = useState(false);

  const { data: patientsData } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients').then(r => r.data),
  });

  const patients = patientsData?.patients || [];

  const createRx = useMutation({
    mutationFn: (body: object) => api.post('/prescriptions', body).then(r => r.data),
  });

  const authorizeRx = useMutation({
    mutationFn: (id: string) => api.post(`/prescriptions/${id}/authorize`).then(r => r.data),
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!patientId) { setError('Please select a patient.'); return; }
    if (items.length === 0) { setError('Add at least one medicine item.'); return; }

    for (const item of items) {
      if (!item.generic_name || !item.strength || !item.dose_quantity || !item.frequency) {
        setError('Please fill in all required fields for each medicine (Generic Name, Strength, Dose, Frequency).'); return;
      }
    }

    setError('');
    try {
      const body = { patient_id: patientId, diagnosis: diagnosis || undefined, notes: notes || undefined, valid_until: validUntil || undefined, items };
      const result = await createRx.mutateAsync(body);
      const rxId = result.prescription.id;

      if (autoAuth) {
        await authorizeRx.mutateAsync(rxId);
      }
      navigate(`/doctor/prescriptions/${rxId}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to create prescription.');
    }
  }

  const isLoading = createRx.isPending || authorizeRx.isPending;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">New Prescription</h1>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Patient selection */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Patient & Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Select Patient *</label>
              <select className="input" value={patientId} onChange={e => setPatientId(e.target.value)} required>
                <option value="">— Choose patient —</option>
                {patients.map((p: { id: string; full_name: string; email: string }) => (
                  <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Valid Until</label>
              <input className="input" type="date" value={validUntil}
                onChange={e => setValidUntil(e.target.value)}
                min={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
          <div>
            <label className="label">Diagnosis / Chief Complaint</label>
            <input className="input" value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
              placeholder="e.g. Bacterial throat infection" />
          </div>
          <div>
            <label className="label">Notes for Patient / Pharmacist</label>
            <textarea className="input resize-none" rows={2} value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional instructions…" />
          </div>
        </div>

        {/* Medicines */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Medicines</h2>
          <MedicineItemForm items={items} onChange={setItems} />
        </div>

        {/* Submit options */}
        <div className="card flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input type="checkbox" className="rounded border-gray-300 text-teal-600"
              checked={autoAuth} onChange={e => setAutoAuth(e.target.checked)} />
            Authorize immediately after creating
          </label>
          <div className="flex gap-3 sm:ml-auto">
            <Button variant="secondary" type="button" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" loading={isLoading}>
              {autoAuth ? 'Create & Authorize' : 'Save as Draft'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
