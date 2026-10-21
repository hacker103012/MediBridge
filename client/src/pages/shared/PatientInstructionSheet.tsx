import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Printer, ArrowLeft, AlertTriangle, ShieldCheck, Phone,
  Sun, Coffee, Sunset, Moon, HeartHandshake
} from 'lucide-react';
import api from '../../lib/api';
import { formatDate, formatDateTime } from '../../lib/utils';
import Button from '../../components/ui/Button';
import type { Prescription, PrescriptionItem } from '../../types';

type SupportedLang = 'en' | 'hi' | 'mr';

// Comprehensive localized strings for the instruction sheet
const sheetText: Record<SupportedLang, Record<string, string>> = {
  en: {
    heading: 'MediBridge Healthcare Network',
    subheading: 'Official Patient Medication Instruction Sheet',
    tagline: 'Simple, Verified Medication Instructions for Safe Healing',
    verifiedBadge: 'AUTHORIZED & CLINICALLY VERIFIED PRESCRIPTION',
    unverifiedTitle: 'UNAUTHORIZED PRESCRIPTION — CANNOT PRINT',
    unverifiedMsg: 'This prescription is not in an authorized status. An official patient instruction sheet cannot be generated for unverified or cancelled prescriptions.',
    printBtn: 'Print Instruction Sheet',
    backBtn: 'Back to Prescription',
    languageLabel: 'Select Language for Instruction Sheet:',
    patientInfo: 'Patient Details',
    rxInfo: 'Prescription Information',
    patientName: 'Patient Name',
    rxNo: 'Prescription No.',
    doctorName: 'Prescribing Doctor',
    clinicName: 'Clinic / Hospital',
    authorizedDate: 'Authorization Date',
    diagnosis: 'Diagnosis / Chief Condition',
    notSpecified: 'Not specified; confirm with your doctor or pharmacist.',
    tableNum: '#',
    tableMed: 'Medicine Name & Form',
    tableDose: 'Dosage Quantity',
    tableSchedule: 'When to Take (Time Slot)',
    tableFood: 'Food & Administration',
    tableDuration: 'Duration',
    tableNotes: 'Special Instructions',
    noneSpecified: 'None specified.',
    dailySummaryHeading: 'Daily Medicine Routine at a Glance',
    morning: 'Morning (Breakfast)',
    afternoon: 'Afternoon (Lunch)',
    evening: 'Evening (Tea / Snacks)',
    night: 'Night (Dinner / Bedtime)',
    morningShort: 'Morning',
    afternoonShort: 'Afternoon',
    eveningShort: 'Evening',
    nightShort: 'Night',
    beforeFood: 'Before food',
    afterFood: 'After food',
    withFood: 'With food',
    emptyStomach: 'On empty stomach',
    anyTime: 'Any time',
    takeFor: 'Take for',
    days: 'days',
    contactNoticeTitle: 'IMPORTANT PATIENT SAFETY NOTICE',
    contactNoticeBody: 'If you feel unwell, experience any unexpected reaction, or find any instruction unclear, do NOT guess. Immediately contact your doctor or visit your dispensing pharmacist.',
    lastUpdated: 'Instruction Sheet Generated On',
    systemNote: 'Generated via MediBridge Rural Health Safety Platform • Keep this sheet with your medicine box.',
  },
  hi: {
    heading: 'मेडीब्रिज स्वास्थ्य नेटवर्क',
    subheading: 'आधिकारिक रोगी दवा निर्देश पत्र (Patient Medication Sheet)',
    tagline: 'सुरक्षित स्वास्थ्य लाभ के लिए सरल एवं सत्यापित दवा निर्देश',
    verifiedBadge: 'अधिकृत एवं चिकित्सीय रूप से सत्यापित नुस्खा',
    unverifiedTitle: 'अनाधिकृत नुस्खा — प्रिंट नहीं किया जा सकता',
    unverifiedMsg: 'यह नुस्खा अधिकृत स्थिति में नहीं है। अपुष्ट या रद्द किए गए नुस्खे के लिए निर्देश पत्र नहीं बनाया जा सकता।',
    printBtn: 'निर्देश पत्र प्रिंट करें',
    backBtn: 'वापस जाएं',
    languageLabel: 'निर्देश पत्र की भाषा चुनें:',
    patientInfo: 'रोगी का विवरण',
    rxInfo: 'नुस्खा (Prescription) विवरण',
    patientName: 'रोगी का नाम',
    rxNo: 'नुस्खा क्रमांक',
    doctorName: 'परामर्शदाता डॉक्टर',
    clinicName: 'क्लिनिक / अस्पताल',
    authorizedDate: 'स्वीकृति दिनांक',
    diagnosis: 'बीमारी / निदान (Diagnosis)',
    notSpecified: 'निर्दिष्ट नहीं; अपने डॉक्टर या फार्मासिस्ट से पुष्टि करें।',
    tableNum: 'क्र.',
    tableMed: 'दवा का नाम एवं प्रकार',
    tableDose: 'खुराक की मात्रा',
    tableSchedule: 'दवा कब लें (समय)',
    tableFood: 'भोजन संबंधी निर्देश',
    tableDuration: 'अवधि',
    tableNotes: 'विशेष निर्देश',
    noneSpecified: 'कोई विशेष निर्देश नहीं।',
    dailySummaryHeading: 'दैनिक दवा सारणी (सरल समय चक्र)',
    morning: 'सुबह (नाश्ता)',
    afternoon: 'दोपहर (दोपहर का खाना)',
    evening: 'शाम (चाय / नाश्ता)',
    night: 'रात (रात का खाना / सोते समय)',
    morningShort: 'सुबह',
    afternoonShort: 'दोपहर',
    eveningShort: 'शाम',
    nightShort: 'रात',
    beforeFood: 'खाने से पहले',
    afterFood: 'खाने के बाद',
    withFood: 'खाने के साथ',
    emptyStomach: 'खाली पेट',
    anyTime: 'किसी भी समय',
    takeFor: 'अवधि:',
    days: 'दिन',
    contactNoticeTitle: 'महत्वपूर्ण रोगी सुरक्षा चेतावनी',
    contactNoticeBody: 'यदि आपकी तबीयत ठीक न लगे, कोई दुष्प्रभाव महसूस हो, या कोई निर्देश समझ में न आए, तो स्वयं अनुमान न लगाएं। तुरंत अपने डॉक्टर से संपर्क करें या नजदीकी फार्मासिस्ट को दिखाएं।',
    lastUpdated: 'निर्देश पत्र प्रिंट / निर्माण समय',
    systemNote: 'मेडीब्रिज ग्रामीण स्वास्थ्य सुरक्षा प्रणाली द्वारा निर्मित • इस पत्र को अपनी दवा के डिब्बे के साथ रखें।',
  },
  mr: {
    heading: 'मेडीब्रिज आरोग्य नेटवर्क',
    subheading: 'अधिकृत रुग्ण औषध सूचना पत्रक (Patient Medication Sheet)',
    tagline: 'सुरक्षित आरोग्यासाठी सोप्या आणि पडताळलेल्या औषध सूचना',
    verifiedBadge: 'अधिकृत आणि वैद्यकीयदृष्ट्या पडताळलेले प्रिस्क्रिप्शन',
    unverifiedTitle: 'अनधिकृत प्रिस्क्रिप्शन — प्रिंट करता येत नाही',
    unverifiedMsg: 'हे प्रिस्क्रिप्शन अधिकृत स्थितीत नाही. अनधिकृत किंवा रद्द केलेल्या प्रिस्क्रिप्शनसाठी औषध सूचना पत्रक तयार केले जाऊ शकत नाही.',
    printBtn: 'सूचना पत्रक प्रिंट करा',
    backBtn: 'मागे जा',
    languageLabel: 'सूचना पत्रकाची भाषा निवडा:',
    patientInfo: 'रुग्णाची माहिती',
    rxInfo: 'प्रिस्क्रिप्शन तपशील',
    patientName: 'रुग्णाचे नाव',
    rxNo: 'प्रिस्क्रिप्शन क्रमांक',
    doctorName: 'सल्लागार डॉक्टर',
    clinicName: 'दवाखाना / रुग्णालय',
    authorizedDate: 'मंजुरी तारीख',
    diagnosis: 'निदान / आजार (Diagnosis)',
    notSpecified: 'निर्देशित नाही; आपल्या डॉक्टरांशी किंवा फार्मासिस्टशी खात्री करा.',
    tableNum: 'क्र.',
    tableMed: 'औषधाचे नाव व प्रकार',
    tableDose: 'डोसचे प्रमाण',
    tableSchedule: 'कधी घ्यावे (वेळ)',
    tableFood: 'जेवणाविषयी सूचना',
    tableDuration: 'कालावधी',
    tableNotes: 'विशेष सूचना',
    noneSpecified: 'काही विशेष सूचना नाही.',
    dailySummaryHeading: 'दैनंदिन औषध दिनचर्या (सोपे वेळापत्रक)',
    morning: 'सकाळी (न्याहारी)',
    afternoon: 'दुपारी (दुपारचे जेवण)',
    evening: 'संध्याकाळी (चहा / नाश्ता)',
    night: 'रात्री (रात्रीचे जेवण / झोपताना)',
    morningShort: 'सकाळी',
    afternoonShort: 'दुपारी',
    eveningShort: 'संध्याकाळी',
    nightShort: 'रात्री',
    beforeFood: 'जेवणापूर्वी',
    afterFood: 'जेवणानंतर',
    withFood: 'जेवणासोबत',
    emptyStomach: 'उपाशी पोटी',
    anyTime: 'कधीही',
    takeFor: 'कालावधी:',
    days: 'दिवस',
    contactNoticeTitle: 'महत्त्वाची रुग्ण सुरक्षा सूचना',
    contactNoticeBody: 'जर आपल्याला बरे वाटत नसेल, काही दुष्परिणाम जाणवत असतील किंवा कोणतीही सूचना स्पष्ट नसेल, तर स्वतः तर्क करू नका. ताबडतोब आपल्या डॉक्टरांशी संपर्क साधा किंवा जवळच्या फार्मासिस्टला दाखवा.',
    lastUpdated: 'सूचना पत्रक निर्मिती वेळ',
    systemNote: 'मेडीब्रिज ग्रामीण आरोग्य सुरक्षा प्रणालीद्वारे तयार • हे पत्रक आपल्या औषधांच्या डब्यासोबत सुरक्षित ठेवा.',
  },
};

export default function PatientInstructionSheet() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lang, setLang] = useState<SupportedLang>('en');

  const { data, isLoading } = useQuery({
    queryKey: ['prescription', id],
    queryFn: () => api.get(`/prescriptions/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const rx: Prescription | undefined = data?.prescription;
  const items: PrescriptionItem[] = data?.items || [];
  const doctorProfile = data?.doctor_profile;
  const patientProfile = data?.patient_profile;

  const t = sheetText[lang];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!rx) {
    return (
      <div className="card max-w-xl mx-auto my-12 text-center py-12 space-y-3">
        <p className="text-gray-500 font-medium">Prescription record not found.</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Return Back
        </Button>
      </div>
    );
  }

  // Safety Requirement: Never present unauthorized, draft, or cancelled prescriptions as verified sheets
  const isAuthorized = ['authorized', 'partially_dispensed', 'dispensed'].includes(rx.status);

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto my-12 space-y-4">
        <div className="p-6 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertTriangle size={28} className="text-amber-600 shrink-0" />
            <h2 className="text-lg font-bold">{t.unverifiedTitle}</h2>
          </div>
          <p className="text-sm leading-relaxed">{t.unverifiedMsg}</p>
          <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-xs font-mono">
            Prescription #{rx.prescription_no} • Current Status: <strong>{rx.status.toUpperCase()}</strong>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
            {t.backBtn}
          </Button>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const getFoodInstructionText = (fi: string) => {
    switch (fi) {
      case 'after_food': return t.afterFood;
      case 'before_food': return t.beforeFood;
      case 'with_food': return t.withFood;
      case 'empty_stomach': return t.emptyStomach;
      case 'any': return t.anyTime;
      default: return t.notSpecified;
    }
  };

  // Group items by time slots for the rural visual daily routine
  const morningItems = items.filter(i => i.morning === 1);
  const afternoonItems = items.filter(i => i.afternoon === 1);
  const eveningItems = items.filter(i => i.evening === 1);
  const nightItems = items.filter(i => i.night === 1);

  return (
    <div className="min-h-screen py-4 sm:py-6 px-2 sm:px-4 print:p-0 print:m-0 print:min-h-0">
      {/* ── TOOLBAR (Hidden completely on print) ── */}
      <div className="no-print max-w-4xl mx-auto mb-6 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100 flex items-center gap-1.5 text-sm font-medium transition-colors"
          >
            <ArrowLeft size={18} /> {t.backBtn}
          </button>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 hidden md:inline">
            {t.languageLabel}
          </span>
          <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200">
            {(
              [
                { code: 'en', label: 'English' },
                { code: 'hi', label: 'हिन्दी (Hindi)' },
                { code: 'mr', label: 'मराठी (Marathi)' },
              ] as const
            ).map(opt => (
              <button
                key={opt.code}
                type="button"
                onClick={() => setLang(opt.code)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  lang === opt.code
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Print Trigger */}
        <Button
          onClick={handlePrint}
          className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2 font-bold px-5 py-2.5 shadow-sm"
        >
          <Printer size={18} /> {t.printBtn}
        </Button>
      </div>

      {/* ── PRINTABLE SHEET CANVAS (Standard A4 Paper Dimensions) ── */}
      <div className="printable-sheet max-w-4xl mx-auto bg-white p-6 sm:p-10 border border-gray-300 rounded-2xl shadow-sm text-gray-900 font-sans print:border-0 print:p-0 print:m-0 print:shadow-none print:max-w-none">
        
        {/* Document Header */}
        <div className="border-b-2 border-gray-900 pb-4 mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-800">
              <HeartHandshake size={28} className="print:text-black" />
              <h1 className="text-2xl font-black tracking-tight">{t.heading}</h1>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mt-1">{t.subheading}</h2>
            <p className="text-xs text-gray-500 mt-0.5 print:text-gray-700">{t.tagline}</p>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-600 text-green-900 rounded-lg text-xs font-black uppercase tracking-wider print:border-black print:text-black">
              <ShieldCheck size={14} /> {t.verifiedBadge}
            </span>
            <p className="text-xs font-mono font-bold text-gray-600 mt-1.5">
              Rx: {rx.prescription_no}
            </p>
          </div>
        </div>

        {/* Patient & Doctor Context Grid */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl mb-6 text-sm print:bg-white print:border-gray-400">
          <div className="space-y-1.5 border-r border-gray-200 pr-4 print:border-gray-400">
            <h3 className="font-bold text-xs uppercase tracking-wider text-teal-800 print:text-black border-b border-gray-200 pb-1">
              {t.patientInfo}
            </h3>
            <div>
              <span className="text-xs text-gray-500 block">{t.patientName}</span>
              <span className="text-base font-black text-gray-900">{rx.patient_name || t.notSpecified}</span>
            </div>
            {patientProfile?.date_of_birth && (
              <div>
                <span className="text-xs text-gray-500 block">Date of Birth / Age</span>
                <span className="font-semibold">{formatDate(patientProfile.date_of_birth)}</span>
              </div>
            )}
            {patientProfile?.allergies && patientProfile.allergies !== 'None known' && (
              <div className="p-2 bg-red-50 border border-red-300 rounded text-red-900 text-xs font-bold print:border-black print:text-black">
                ⚠ Known Allergies: {patientProfile.allergies}
              </div>
            )}
          </div>

          <div className="space-y-1.5 pl-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-teal-800 print:text-black border-b border-gray-200 pb-1">
              {t.rxInfo}
            </h3>
            <div>
              <span className="text-xs text-gray-500 block">{t.doctorName}</span>
              <span className="text-base font-black text-gray-900">Dr. {rx.doctor_name || t.notSpecified}</span>
              {doctorProfile?.qualification && (
                <span className="text-xs text-gray-600 block">{doctorProfile.qualification}</span>
              )}
            </div>
            {doctorProfile?.clinic_name && (
              <div>
                <span className="text-xs text-gray-500 block">{t.clinicName}</span>
                <span className="font-semibold text-xs">{doctorProfile.clinic_name} {doctorProfile.city ? `(${doctorProfile.city})` : ''}</span>
              </div>
            )}
            <div>
              <span className="text-xs text-gray-500 block">{t.diagnosis}</span>
              <span className="font-medium text-xs text-gray-800">{rx.diagnosis || t.notSpecified}</span>
            </div>
          </div>
        </div>

        {/* Prescribed Medications Table */}
        <div className="mb-6">
          <table className="w-full text-left border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-xs font-black text-gray-800 print:bg-gray-200">
                <th className="p-2.5 border border-gray-300 w-10 text-center">{t.tableNum}</th>
                <th className="p-2.5 border border-gray-300">{t.tableMed}</th>
                <th className="p-2.5 border border-gray-300">{t.tableDose}</th>
                <th className="p-2.5 border border-gray-300">{t.tableSchedule}</th>
                <th className="p-2.5 border border-gray-300">{t.tableFood}</th>
                <th className="p-2.5 border border-gray-300">{t.tableDuration}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item, idx) => {
                const timeSlotLabels = [];
                if (item.morning === 1) timeSlotLabels.push(t.morningShort);
                if (item.afternoon === 1) timeSlotLabels.push(t.afternoonShort);
                if (item.evening === 1) timeSlotLabels.push(t.eveningShort);
                if (item.night === 1) timeSlotLabels.push(t.nightShort);

                const hasSchedule = timeSlotLabels.length > 0;

                return (
                  <tr key={item.id} className="border-b border-gray-300 print:border-gray-400">
                    <td className="p-2.5 border border-gray-300 text-center font-bold text-gray-600">
                      {idx + 1}
                    </td>
                    <td className="p-2.5 border border-gray-300">
                      <p className="font-black text-base text-gray-900 leading-snug">
                        {item.generic_name} {item.strength}{item.strength_unit}
                      </p>
                      {item.brand_name && (
                        <p className="text-xs text-gray-600 font-semibold mt-0.5">
                          Brand: {item.brand_name}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 capitalize mt-0.5">
                        {item.dosage_form || 'Form not specified'}
                      </p>
                      {item.special_instructions && (
                        <p className="text-xs font-semibold text-teal-800 mt-1 italic print:text-black">
                          * {item.special_instructions}
                        </p>
                      )}
                    </td>
                    <td className="p-2.5 border border-gray-300 font-bold text-gray-900">
                      {item.dose_quantity || t.notSpecified}
                    </td>
                    <td className="p-2.5 border border-gray-300">
                      {hasSchedule ? (
                        <span className="font-bold text-teal-900 bg-teal-50 px-2 py-1 rounded border border-teal-200 text-xs block print:border-black print:bg-white print:text-black">
                          {timeSlotLabels.join(' + ')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">{item.frequency || t.notSpecified}</span>
                      )}
                    </td>
                    <td className="p-2.5 border border-gray-300 font-medium text-xs text-gray-800">
                      {getFoodInstructionText(item.food_instruction)}
                    </td>
                    <td className="p-2.5 border border-gray-300 text-xs font-bold text-gray-800">
                      {item.duration_days ? `${item.duration_days} ${t.days}` : t.notSpecified}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── RURAL ACCESSIBILITY: SIMPLE VISUAL DAILY ROUTINE (Morning / Noon / Evening / Night) ── */}
        <div className="mb-6 border-2 border-gray-300 rounded-xl p-4 bg-gray-50/60 print:bg-white print:border-gray-400">
          <h3 className="font-black text-sm uppercase tracking-wide text-gray-900 mb-3 text-center border-b border-gray-200 pb-2 print:border-gray-400">
            {t.dailySummaryHeading}
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* Morning */}
            <div className="p-2.5 bg-white border border-gray-300 rounded-lg space-y-1.5 print:border-gray-400">
              <div className="flex items-center gap-1.5 font-bold text-gray-800 border-b border-gray-200 pb-1">
                <Sun size={16} className="text-amber-500 print:text-black" />
                <span>{t.morning}</span>
              </div>
              {morningItems.length === 0 ? (
                <p className="text-gray-400 italic">No medicine</p>
              ) : (
                <ul className="space-y-1">
                  {morningItems.map(m => (
                    <li key={m.id} className="font-bold text-gray-900 leading-snug">
                      • {m.generic_name} ({m.dose_quantity})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Afternoon */}
            <div className="p-2.5 bg-white border border-gray-300 rounded-lg space-y-1.5 print:border-gray-400">
              <div className="flex items-center gap-1.5 font-bold text-gray-800 border-b border-gray-200 pb-1">
                <Coffee size={16} className="text-orange-500 print:text-black" />
                <span>{t.afternoon}</span>
              </div>
              {afternoonItems.length === 0 ? (
                <p className="text-gray-400 italic">No medicine</p>
              ) : (
                <ul className="space-y-1">
                  {afternoonItems.map(m => (
                    <li key={m.id} className="font-bold text-gray-900 leading-snug">
                      • {m.generic_name} ({m.dose_quantity})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Evening */}
            <div className="p-2.5 bg-white border border-gray-300 rounded-lg space-y-1.5 print:border-gray-400">
              <div className="flex items-center gap-1.5 font-bold text-gray-800 border-b border-gray-200 pb-1">
                <Sunset size={16} className="text-indigo-500 print:text-black" />
                <span>{t.evening}</span>
              </div>
              {eveningItems.length === 0 ? (
                <p className="text-gray-400 italic">No medicine</p>
              ) : (
                <ul className="space-y-1">
                  {eveningItems.map(m => (
                    <li key={m.id} className="font-bold text-gray-900 leading-snug">
                      • {m.generic_name} ({m.dose_quantity})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Night */}
            <div className="p-2.5 bg-white border border-gray-300 rounded-lg space-y-1.5 print:border-gray-400">
              <div className="flex items-center gap-1.5 font-bold text-gray-800 border-b border-gray-200 pb-1">
                <Moon size={16} className="text-blue-500 print:text-black" />
                <span>{t.night}</span>
              </div>
              {nightItems.length === 0 ? (
                <p className="text-gray-400 italic">No medicine</p>
              ) : (
                <ul className="space-y-1">
                  {nightItems.map(m => (
                    <li key={m.id} className="font-bold text-gray-900 leading-snug">
                      • {m.generic_name} ({m.dose_quantity})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Safety Callout Box */}
        <div className="border-2 border-red-600 rounded-xl p-3.5 mb-5 bg-red-50/50 print:bg-white print:border-black">
          <div className="flex items-start gap-2.5">
            <Phone size={18} className="text-red-600 shrink-0 mt-0.5 print:text-black" />
            <div>
              <h4 className="font-black text-xs uppercase tracking-wide text-red-900 print:text-black">
                {t.contactNoticeTitle}
              </h4>
              <p className="text-xs text-red-800 font-semibold mt-0.5 print:text-black leading-relaxed">
                {t.contactNoticeBody}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Audit Line */}
        <div className="border-t border-gray-300 pt-3 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 print:text-black gap-1">
          <p>
            {t.lastUpdated}: <strong>{formatDateTime(new Date().toISOString())}</strong>
          </p>
          <p className="text-center sm:text-right">
            {t.systemNote}
          </p>
        </div>
      </div>
    </div>
  );
}
