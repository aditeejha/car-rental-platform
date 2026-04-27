'use client';
import { Search } from 'lucide-react';

const QUICK = [
  { label: 'Under ₹3,000', set: { maxPrice: 3000 } },
  { label: 'Family (5+)',  set: { minSeats: 5 } },
  { label: 'Bengaluru',    set: { city: 'Bengaluru' } },
  { label: 'EV only',      set: { category: 'ev' } },
  { label: 'SUV',          set: { category: 'suv' } },
  { label: 'Luxury',       set: { category: 'luxury' } },
];

export default function Filters({ value, onChange }) {
  const v = value || {};
  const set = (k, x) => onChange({ ...v, [k]: x });
  const apply = (patch) => onChange({ ...v, ...patch });
  const clear = () => onChange({});
  const isActive = (patch) => Object.entries(patch).every(([k, val]) => String(v[k] ?? '') === String(val));

  return (
    <div className="space-y-3">
      <div className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs text-slate-400">City</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-500"/>
            <input
              className="input pl-9"
              placeholder="Bengaluru, Mumbai, Delhi…"
              value={v.city || ''}
              onChange={(e) => set('city', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400">Category</label>
          <select className="input" value={v.category || ''} onChange={(e) => set('category', e.target.value)}>
            <option value="">Any</option>
            <option value="hatchback">Hatchback</option>
            <option value="sedan">Sedan</option>
            <option value="suv">SUV</option>
            <option value="ev">EV</option>
            <option value="luxury">Luxury</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400">Min seats</label>
          <input type="number" min={2} max={9} className="input"
                 value={v.minSeats || ''} onChange={(e) => set('minSeats', e.target.value)}/>
        </div>
        <div>
          <label className="text-xs text-slate-400">Max ₹/day</label>
          <input type="number" min={500} step={500} className="input"
                 value={v.maxPrice || ''} onChange={(e) => set('maxPrice', e.target.value)}/>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {QUICK.map((q) => (
          <button
            key={q.label}
            onClick={() => apply(q.set)}
            className={`chip cursor-pointer hover:bg-ink-600 ${isActive(q.set) ? 'bg-brand-600 text-white border-brand-500' : ''}`}
          >
            {q.label}
          </button>
        ))}
        {Object.keys(v).length > 0 && (
          <button onClick={clear} className="text-xs text-slate-400 hover:text-slate-200 ml-2 underline">Clear all</button>
        )}
      </div>
    </div>
  );
}
