import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', opts || { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function getStatusBadgeClass(status: string) {
  return `badge-${status}` as string;
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: 'Draft',
    awaiting_review: 'Awaiting Review',
    authorized: 'Authorized',
    partially_dispensed: 'Partially Dispensed',
    dispensed: 'Dispensed',
    cancelled: 'Cancelled',
    superseded: 'Superseded',
  };
  return labels[status] || status;
}

export function getFoodInstructionLabel(fi: string) {
  const labels: Record<string, string> = {
    before_food: 'Before food',
    after_food: 'After food',
    with_food: 'With food',
    empty_stomach: 'On empty stomach',
    any: 'Any time',
    not_specified: 'As directed',
  };
  return labels[fi] || fi;
}

export function buildScheduleText(item: {
  morning: number; afternoon: number; evening: number; night: number;
  frequency: string; duration_days?: number | null;
  food_instruction: string; dose_quantity: string;
}) {
  const slots = [];
  if (item.morning)   slots.push('morning');
  if (item.afternoon) slots.push('afternoon');
  if (item.evening)   slots.push('evening');
  if (item.night)     slots.push('night');

  const food = getFoodInstructionLabel(item.food_instruction);
  const dur  = item.duration_days ? `for ${item.duration_days} days` : '';
  const dose = item.dose_quantity;

  if (slots.length > 0) {
    return `Take ${dose} in the ${slots.join(', ')} — ${food}${dur ? ' ' + dur : ''}.`;
  }
  return `${dose} — ${item.frequency} — ${food}${dur ? ' ' + dur : ''}.`;
}

// i18n basic translations
export const translations: Record<string, Record<string, string>> = {
  en: {
    'prescription.authorized': 'Your prescription is authorized and ready to collect.',
    'take': 'Take',
    'morning': 'morning',
    'afternoon': 'afternoon',
    'evening': 'evening',
    'night': 'night',
    'days': 'days',
    'after_food': 'after food',
    'before_food': 'before food',
    'with_food': 'with food',
  },
  hi: {
    'prescription.authorized': 'आपका नुस्खा अधिकृत है और लेने के लिए तैयार है।',
    'take': 'लें',
    'morning': 'सुबह',
    'afternoon': 'दोपहर',
    'evening': 'शाम',
    'night': 'रात',
    'days': 'दिन',
    'after_food': 'खाने के बाद',
    'before_food': 'खाने से पहले',
    'with_food': 'खाने के साथ',
  },
  mr: {
    'prescription.authorized': 'तुमचे प्रिस्क्रिप्शन अधिकृत आहे आणि घेण्यासाठी तयार आहे.',
    'take': 'घ्या',
    'morning': 'सकाळी',
    'afternoon': 'दुपारी',
    'evening': 'संध्याकाळी',
    'night': 'रात्री',
    'days': 'दिवस',
    'after_food': 'जेवणानंतर',
    'before_food': 'जेवणापूर्वी',
    'with_food': 'जेवणासोबत',
  },
};

export function t(key: string, lang: string = 'en'): string {
  return translations[lang]?.[key] || translations['en']?.[key] || key;
}

export function buildLocalizedInstruction(item: {
  generic_name: string; dose_quantity: string; morning: number; afternoon: number;
  evening: number; night: number; food_instruction: string; duration_days?: number | null;
}, lang: string): string {
  const slots = [];
  if (item.morning)   slots.push(t('morning', lang));
  if (item.afternoon) slots.push(t('afternoon', lang));
  if (item.evening)   slots.push(t('evening', lang));
  if (item.night)     slots.push(t('night', lang));

  const food = t(item.food_instruction, lang);
  const dur  = item.duration_days ? `${item.duration_days} ${t('days', lang)}` : '';
  const take = t('take', lang);

  if (slots.length > 0) {
    return `${take} ${item.dose_quantity} ${item.generic_name} — ${slots.join(', ')} — ${food}${dur ? ' ' + dur : ''}.`;
  }
  return `${take} ${item.dose_quantity} ${item.generic_name} — ${food}${dur ? ' ' + dur : ''}.`;
}
