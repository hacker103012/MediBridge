import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, QrCode, User, Calendar, Pill, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatDateTime, buildLocalizedInstruction, buildScheduleText } from '../../lib/utils';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import type { Prescription, PrescriptionItem } from '../../types';

export default function PatientPrescriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showQR, setShowQR] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['prescription', id],
    queryFn: () => api.get(`/prescriptions/${id}`).then(r => r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.prescription) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>Prescription not found.</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/patient/prescriptions')}>
          Back to Prescriptions
        </Button>
      </div>
    );
  }

  const rx: Prescription = data.prescription;
  const items: PrescriptionItem[] = data.items || [];
  const doctorProfile = data.doctor_profile;
  const userLang = user?.language || 'en';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 font-mono">{rx.prescription_no}</h1>
            <StatusBadge status={rx.status} />
          </div>
          <p className="text-gray-400 text-xs mt-0.5">
            Prescribed on {formatDate(rx.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowQR(p => !p)}
            className="flex items-center gap-1.5"
          >
            <QrCode size={16} />
            {showQR ? 'Hide QR' : 'Show QR'}
          </Button>

          {['authorized', 'partially_dispensed', 'dispensed'].includes(rx.status) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/patient/prescriptions/${rx.id}/print`)}
              className="flex items-center gap-1.5 text-teal-700 border-teal-200 hover:bg-teal-50"
            >
              <Printer size={16} /> Print Sheet
            </Button>
          )}
        </div>
      </div>

      {/* QR Code Presentation Box */}
      {showQR && (
        <div className="card flex flex-col items-center justify-center text-center p-6 bg-white border border-teal-100 shadow-sm">
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-3">
            Present this QR code to the pharmacist
          </p>
          <div className="p-3 bg-white border border-gray-200 rounded-2xl shadow-inner">
            <QRCodeSVG
              value={JSON.stringify({ rx_id: rx.id, rx_no: rx.prescription_no, status: rx.status })}
              size={180}
              level="H"
            />
          </div>
          <p className="font-mono text-sm font-bold text-gray-800 mt-3">{rx.prescription_no}</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            The pharmacist scans this QR code to instantly verify and safely dispense your medication.
          </p>
        </div>
      )}

      {/* Doctor & Prescription Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card space-y-2">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
            <User size={16} className="text-teal-600" /> Prescribing Doctor
          </div>
          <p className="font-semibold text-gray-800 text-base">Dr. {rx.doctor_name}</p>
          {doctorProfile?.specialization && (
            <p className="text-xs text-teal-700 bg-teal-50 rounded px-2 py-0.5 inline-block">
              {doctorProfile.specialization}
            </p>
          )}
          {doctorProfile?.clinic_name && (
            <p className="text-sm text-gray-600">{doctorProfile.clinic_name}</p>
          )}
          {doctorProfile?.clinic_address && (
            <p className="text-xs text-gray-400">{doctorProfile.clinic_address}</p>
          )}
        </div>

        <div className="card space-y-2">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
            <Calendar size={16} className="text-teal-600" /> Prescription Details
          </div>
          {rx.diagnosis && (
            <p className="text-sm text-gray-700">
              <span className="text-gray-400">Diagnosis:</span> {rx.diagnosis}
            </p>
          )}
          {rx.notes && (
            <p className="text-sm text-gray-700">
              <span className="text-gray-400">Doctor's Notes:</span> {rx.notes}
            </p>
          )}
          {rx.valid_until && (
            <p className="text-sm text-gray-700">
              <span className="text-gray-400">Valid Until:</span> {formatDate(rx.valid_until)}
            </p>
          )}
          {rx.authorized_at && (
            <p className="text-xs text-green-600 font-medium">
              ✓ Authorized by doctor on {formatDateTime(rx.authorized_at)}
            </p>
          )}
        </div>
      </div>

      {/* Medicines List */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Pill size={18} className="text-teal-600" />
          <h2 className="font-semibold text-gray-800">Prescribed Medicines ({items.length})</h2>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-gray-400 py-3 text-center">No medicines recorded for this prescription.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/70 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-gray-400 font-medium">#{idx + 1}</span>
                    <h3 className="font-bold text-gray-800 text-base">
                      {item.generic_name} {item.strength}{item.strength_unit}
                      {item.brand_name && (
                        <span className="ml-1.5 text-sm font-normal text-gray-500">
                          ({item.brand_name})
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-500 capitalize">
                      {item.dosage_form} • {item.route} administration
                    </p>
                  </div>
                </div>

                {/* Localized Dosage Instruction */}
                <div className="p-3 bg-white rounded-lg border border-gray-100">
                  <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider mb-1">
                    How to take
                  </p>
                  <p className="text-sm font-medium text-gray-800">
                    {userLang !== 'en'
                      ? buildLocalizedInstruction(item, userLang)
                      : buildScheduleText(item)}
                  </p>
                </div>

                {item.special_instructions && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5 border border-amber-100">
                    ⚠ Note: {item.special_instructions}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
