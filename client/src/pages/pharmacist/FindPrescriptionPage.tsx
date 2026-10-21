import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, QrCode, ArrowRight, Clock, AlertCircle, Printer } from 'lucide-react';
import api from '../../lib/api';
import { formatDate } from '../../lib/utils';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import type { Prescription } from '../../types';

export default function PharmacistFindPrescriptionPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  // Fetch authorized prescriptions awaiting dispensing
  const { data: rxData, isLoading } = useQuery({
    queryKey: ['prescriptions', 'pharmacist'],
    queryFn: () => api.get('/prescriptions').then(r => r.data),
  });

  const prescriptions: Prescription[] = rxData?.prescriptions || [];

  const handleLookup = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setError('');
    setSearching(true);

    try {
      // Backend lookup route: POST /api/prescriptions/lookup with { query }
      // Query can be rx_id or prescription_no (or parsed JSON from QR)
      let cleaned = query.trim();
      try {
        const parsed = JSON.parse(cleaned);
        if (parsed.rx_id) cleaned = parsed.rx_id;
        else if (parsed.rx_no) cleaned = parsed.rx_no;
      } catch {
        // Normal text entry
      }

      const res = await api.post('/prescriptions/lookup', { query: cleaned });
      if (res.data?.prescription?.id) {
        navigate(`/pharmacist/verify/${res.data.prescription.id}`);
      } else {
        setError('Prescription not found or not currently authorized.');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'No authorized prescription found matching that ID or Rx number.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dispensing & Verification</h1>
        <p className="text-sm text-gray-500 mt-1">
          Scan the patient's QR code or enter an Rx number to verify medicines before dispensing.
        </p>
      </div>

      {/* Search / Scan Box */}
      <div className="card space-y-4 border-2 border-teal-100 bg-teal-50/20">
        <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
          <Search size={16} className="text-teal-600" /> Look Up Prescription
        </h2>

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleLookup} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-10"
              placeholder="Enter Prescription # (e.g. RX-2024-0001) or paste QR payload…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" loading={searching} className="flex items-center gap-2">
            Verify <ArrowRight size={16} />
          </Button>
        </form>

        <p className="text-xs text-gray-400">
          Tip: You can paste the raw QR code JSON string or type the human-readable Rx Number.
        </p>
      </div>

      {/* List of Authorized Prescriptions Ready for Dispensing */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Clock size={16} className="text-teal-600" /> Authorized Prescriptions Ready to Dispense ({prescriptions.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <QrCode size={40} className="mx-auto mb-2 opacity-30" />
            <p>No authorized prescriptions currently awaiting dispensing.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {prescriptions.map(rx => (
              <div
                key={rx.id}
                onClick={() => navigate(`/pharmacist/verify/${rx.id}`)}
                className="py-3.5 px-2 hover:bg-teal-50/50 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-gray-900">{rx.prescription_no}</span>
                    <StatusBadge status={rx.status} />
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5">
                    Patient: <span className="font-medium text-gray-900">{rx.patient_name}</span> • Doctor: Dr. {rx.doctor_name}
                  </p>
                  {rx.diagnosis && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">Diagnosis: {rx.diagnosis}</p>
                  )}
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <span className="text-xs text-gray-400 mr-1 hidden sm:inline">{formatDate(rx.created_at)}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/pharmacist/prescriptions/${rx.id}/print`);
                    }}
                    className="p-1.5 text-xs text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg flex items-center gap-1 font-medium transition-colors"
                    title="Generate Patient Instruction Sheet"
                  >
                    <Printer size={13} /> <span className="hidden md:inline">Print Sheet</span>
                  </button>
                  <span className="text-teal-600 font-medium text-sm flex items-center gap-1 hover:underline">
                    Process <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
