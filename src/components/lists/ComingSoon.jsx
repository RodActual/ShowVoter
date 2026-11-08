import React, { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { localDateString } from '../../titles';
import { whenLabel } from '../../upcoming';

const SHOWN = 3;

// Upcoming episodes and premieres for titles on your lists (#51). Tapping one opens its sheet.
const ComingSoon = ({ items, onOpen }) => {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return null;
  const today = localDateString();
  const visible = expanded ? items : items.slice(0, SHOWN);
  return (
    <section aria-labelledby="coming-soon-heading" className="mb-3 rounded-xl border border-gray-700 bg-gray-800 p-2">
      <h2 id="coming-soon-heading" className="text-[11px] font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1 px-1 pb-1">
        <CalendarClock size={12} aria-hidden="true" /> Coming soon
      </h2>
      <ul>
        {visible.map((u) => (
          <li key={`${u.mode}-${u.item.id}`}>
            <button type="button" onClick={() => onOpen(u)} className="w-full min-h-11 flex items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-gray-700">
              {u.item.posterPath
                ? <img src={u.item.posterPath} alt="" className="w-8 h-12 object-cover rounded shrink-0 bg-gray-700" />
                : <span aria-hidden="true" className="w-8 h-12 rounded shrink-0 bg-gray-700" />}
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-white truncate">{u.item.title}</span>
                <span className="block text-xs text-gray-200 truncate">{[u.label, u.title].filter(Boolean).join(' · ')}</span>
              </span>
              <span className={`shrink-0 text-sm font-semibold ${u.date === today ? 'text-green-300' : 'text-gray-100'}`}>{whenLabel(u.date, today)}</span>
            </button>
          </li>
        ))}
      </ul>
      {items.length > SHOWN && (
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)} className="w-full min-h-11 text-sm font-semibold text-blue-300">
          {expanded ? 'Show less' : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
};

export default ComingSoon;
