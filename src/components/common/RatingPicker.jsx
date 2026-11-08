import React from 'react';

// 1–10 picker sized for thumbs (each button ≥ 44px). Tapping the selected value clears it (0 = not rated).
export const RatingPicker = ({ value = 0, onChange, label }) => (
  <div role="group" aria-label={label}>
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const selected = n === value;
        return (
          <button
            key={n}
            type="button"
            aria-pressed={selected}
            aria-label={`${n} out of 10`}
            onClick={() => onChange(selected ? 0 : n)}
            className={`min-h-11 rounded-lg font-bold text-base transition ${
              selected
                ? 'bg-yellow-400 text-gray-900'
                : n <= value
                  ? 'bg-yellow-400/30 text-yellow-100'
                  : 'bg-gray-900 text-gray-100 border border-gray-500 hover:bg-gray-800'
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  </div>
);

// Compact native select for long episode lists: big tap target, works with screen readers.
export const RatingSelect = ({ value = 0, onChange, label }) => (
  <select
    aria-label={label}
    value={value || 0}
    onChange={(e) => onChange(Number(e.target.value))}
    className="min-h-11 bg-gray-700 text-white border border-gray-500 rounded-lg px-3 text-base"
  >
    <option value={0}>–</option>
    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}/10</option>)}
  </select>
);

export default RatingPicker;
