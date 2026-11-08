import React from 'react';
import { ListTodo, CheckCircle2, BarChart2 } from 'lucide-react';

const TABS = [
  { key: 'toWatch', label: 'To Watch', Icon: ListTodo },
  { key: 'watched', label: 'Watched', Icon: CheckCircle2 },
  { key: 'stats', label: 'Stats', Icon: BarChart2 }
];

// Fixed bottom navigation, padded for the iPhone home indicator.
const TabBar = ({ active, counts, onChange }) => (
  <nav
    aria-label="Main"
    className="fixed bottom-0 inset-x-0 z-40 bg-gray-900/95 backdrop-blur border-t border-gray-700 pb-[env(safe-area-inset-bottom)] px-safe"
  >
    <ul className="max-w-xl mx-auto grid grid-cols-3">
      {TABS.map(({ key, label, Icon }) => {
        const selected = active === key;
        return (
          <li key={key}>
            <button
              type="button"
              aria-current={selected ? 'page' : undefined}
              onClick={() => onChange(key)}
              className={`w-full min-h-14 flex flex-col items-center justify-center gap-0.5 text-xs font-semibold ${selected ? 'text-white' : 'text-gray-300'}`}
            >
              <Icon size={22} aria-hidden="true" className={selected ? 'text-blue-300' : ''} />
              <span>
                {label}
                {counts[key] !== undefined && <span className="sr-only">, {counts[key]} titles</span>}
              </span>
              <span aria-hidden="true" className={`h-0.5 w-8 rounded-full ${selected ? 'bg-blue-300' : 'bg-transparent'}`} />
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
);

export default TabBar;
