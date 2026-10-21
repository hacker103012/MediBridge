import { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { PrescriptionItem } from '../../types';
import Button from './Button';

type ItemDraft = Omit<PrescriptionItem, 'id' | 'prescription_id' | 'created_at' | 'sort_order'>;

const DOSAGE_FORMS = ['tablet','capsule','liquid','injection','syrup','cream','ointment','drops','inhaler','patch','other'];
const ROUTES       = ['oral','topical','intravenous','intramuscular','subcutaneous','inhalation','sublingual','rectal','nasal','ophthalmic','other'];
const FOOD_INSTR   = ['before_food','after_food','with_food','empty_stomach','any','not_specified'];
const FOOD_LABELS: Record<string,string> = {
  before_food: 'Before food', after_food: 'After food', with_food: 'With food',
  empty_stomach: 'Empty stomach', any: 'Any time', not_specified: 'Not specified'
};

const EMPTY_ITEM: ItemDraft = {
  generic_name: '', brand_name: '', strength: '', strength_unit: 'mg',
  dosage_form: 'tablet', route: 'oral', dose_quantity: '', frequency: '',
  duration_days: undefined, food_instruction: 'not_specified',
  morning: 0, afternoon: 0, evening: 0, night: 0, special_instructions: '',
};

interface Props {
  items: ItemDraft[];
  onChange: (items: ItemDraft[]) => void;
}

export default function MedicineItemForm({ items, onChange }: Props) {
  const addItem = () => onChange([...items, { ...EMPTY_ITEM }]);

  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const updateItem = useCallback((idx: number, field: keyof ItemDraft, value: unknown) => {
    onChange(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }, [items, onChange]);

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Medicine #{idx + 1}</span>
            <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>

          {/* Row 1: Generic name + Brand + Strength */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Generic Name *</label>
              <input className="input" value={item.generic_name} required
                onChange={e => updateItem(idx, 'generic_name', e.target.value)}
                placeholder="e.g. Amoxicillin" />
            </div>
            <div>
              <label className="label">Brand Name</label>
              <input className="input" value={item.brand_name || ''}
                onChange={e => updateItem(idx, 'brand_name', e.target.value)}
                placeholder="e.g. Mox" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label">Strength *</label>
                <input className="input" value={item.strength} required
                  onChange={e => updateItem(idx, 'strength', e.target.value)}
                  placeholder="500" />
              </div>
              <div className="w-20">
                <label className="label">Unit</label>
                <select className="input" value={item.strength_unit}
                  onChange={e => updateItem(idx, 'strength_unit', e.target.value)}>
                  {['mg','mcg','g','ml','IU','%'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Row 2: Form + Route + Dose + Frequency */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="label">Dosage Form *</label>
              <select className="input" value={item.dosage_form}
                onChange={e => updateItem(idx, 'dosage_form', e.target.value)}>
                {DOSAGE_FORMS.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Route</label>
              <select className="input" value={item.route}
                onChange={e => updateItem(idx, 'route', e.target.value)}>
                {ROUTES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Dose Qty *</label>
              <input className="input" value={item.dose_quantity} required
                onChange={e => updateItem(idx, 'dose_quantity', e.target.value)}
                placeholder="e.g. 1 tablet" />
            </div>
            <div>
              <label className="label">Duration (days)</label>
              <input className="input" type="number" min={1}
                value={item.duration_days ?? ''}
                onChange={e => updateItem(idx, 'duration_days', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="7" />
            </div>
          </div>

          {/* Row 3: Frequency + Food */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Frequency *</label>
              <input className="input" value={item.frequency} required
                onChange={e => updateItem(idx, 'frequency', e.target.value)}
                placeholder="e.g. twice daily" />
            </div>
            <div>
              <label className="label">Food Instruction</label>
              <select className="input" value={item.food_instruction}
                onChange={e => updateItem(idx, 'food_instruction', e.target.value)}>
                {FOOD_INSTR.map(f => <option key={f} value={f}>{FOOD_LABELS[f]}</option>)}
              </select>
            </div>
          </div>

          {/* Row 4: Time slots */}
          <div>
            <label className="label">Time Slots</label>
            <div className="flex gap-4 flex-wrap">
              {(['morning','afternoon','evening','night'] as const).map(slot => (
                <label key={slot} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-teal-600"
                    checked={item[slot] === 1}
                    onChange={e => updateItem(idx, slot, e.target.checked ? 1 : 0)} />
                  {slot.charAt(0).toUpperCase() + slot.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {/* Row 5: Special instructions */}
          <div>
            <label className="label">Special Instructions</label>
            <input className="input" value={item.special_instructions || ''}
              onChange={e => updateItem(idx, 'special_instructions', e.target.value)}
              placeholder="Additional notes for this medicine" />
          </div>
        </div>
      ))}

      <Button variant="secondary" type="button" onClick={addItem} className="flex items-center gap-2 text-sm">
        <Plus size={16} /> Add Medicine
      </Button>
    </div>
  );
}
