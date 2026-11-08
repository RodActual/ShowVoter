import React from 'react';
import { Search, X } from 'lucide-react';

const chip = (on) => `shrink-0 min-h-11 min-w-11 px-3 rounded-full text-sm font-semibold border ${on ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-100 hover:bg-gray-700'}`;

// Search box, Movie/TV chips, service chips and sort. Chips scroll sideways on narrow screens.
const FilterBar = ({ filters, onChange, services, sort, sortOptions, onSortChange, listLabel }) => {
  const set = (patch) => onChange({ ...filters, ...patch });
  const toggleService = (s) => set({
    services: filters.services.includes(s) ? filters.services.filter((x) => x !== s) : [...filters.services, s]
  });

  return (
    <div className="space-y-2 mb-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <label htmlFor="list-search" className="sr-only">Search {listLabel}</label>
          <input
            id="list-search"
            type="search"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder={`Search ${listLabel}`}
            className="w-full pl-9 pr-9 min-h-11 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:border-blue-400"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => set({ query: '' })}
              aria-label="Clear search"
              className="absolute right-0 top-0 min-w-11 min-h-11 flex items-center justify-center text-gray-300"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        <label className="sr-only" htmlFor="list-sort">Sort {listLabel}</label>
        <select
          id="list-sort"
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="bg-gray-800 text-white border border-gray-600 rounded-xl px-2 min-h-11"
        >
          {sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div role="group" aria-label="Filters" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {[['all', 'All'], ['movie', 'Movies'], ['tv', 'TV']].map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filters.kind === value} onClick={() => set({ kind: value })} className={chip(filters.kind === value)}>
            {label}
          </button>
        ))}
        {services.length > 1 && <span aria-hidden="true" className="w-px shrink-0 bg-gray-700 my-2" />}
        {services.length > 1 && services.map((s) => (
          <button key={s} type="button" aria-pressed={filters.services.includes(s)} onClick={() => toggleService(s)} className={chip(filters.services.includes(s))}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FilterBar;
