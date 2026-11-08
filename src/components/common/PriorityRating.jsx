import React from 'react';

export const PRIORITY_LABELS = { 0: 'None', 1: 'Low', 2: 'Med', 3: 'High' };
const SELECTED = { 1: 'bg-blue-600 text-white', 2: 'bg-yellow-400 text-gray-900', 3: 'bg-red-600 text-white' };
const TEXT = { 0: 'text-gray-300', 1: 'text-blue-300', 2: 'text-yellow-300', 3: 'text-red-300' };

// One tap sets your priority; tapping the selected level clears it.
export const PriorityPicker = ({ value = 0, onChange, label }) => (
  <div role="group" aria-label={label} className="grid grid-cols-3 gap-2">
    {[1, 2, 3].map((level) => {
      const selected = value === level;
      return (
        <button
          key={level}
          type="button"
          aria-pressed={selected}
          onClick={() => onChange(selected ? 0 : level)}
          className={`min-h-11 rounded-lg text-sm font-semibold transition ${selected ? SELECTED[level] : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
        >
          {PRIORITY_LABELS[level]}
        </button>
      );
    })}
  </div>
);

// Read-only: plain text so it doesn't look tappable.
export const PriorityText = ({ value = 0 }) => (
  <span className={`text-sm font-semibold ${TEXT[value] || TEXT[0]}`}>{PRIORITY_LABELS[value] || 'None'}</span>
);

export default PriorityPicker;
