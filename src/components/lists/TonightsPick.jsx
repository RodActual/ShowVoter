import React from 'react';
import { Shuffle, Check, Sparkles } from 'lucide-react';
import { isMovie } from '../../titles';

// Compact suggestion card at the top of To Watch. Tapping the title opens the detail sheet.
const TonightsPick = ({ pick, shared, poolSize, onAnother, onWatched, onOpen }) => {
  if (!pick) return null;
  const iconButton = 'min-w-11 min-h-11 rounded-lg flex items-center justify-center text-white shrink-0';
  return (
    <section
      aria-labelledby="tonight-heading"
      className="mb-3 rounded-xl border border-purple-700 bg-gradient-to-r from-purple-900 to-gray-800 p-1.5 pr-2 flex items-center gap-3"
    >
      {pick.posterPath
        ? <img src={pick.posterPath} alt="" className="w-10 h-[60px] object-cover rounded-md shrink-0 bg-gray-700" />
        : <div aria-hidden="true" className="w-10 h-[60px] rounded-md shrink-0 bg-gray-700" />}
      <div className="flex-1 min-w-0">
        <h2 id="tonight-heading" className="text-[11px] font-bold uppercase tracking-wider text-purple-100 flex items-center gap-1">
          <Sparkles size={12} aria-hidden="true" /> Tonight's pick
          <span className="sr-only">{shared ? ' (you both rated it Med or High)' : ' (from your whole list)'}</span>
        </h2>
        <button type="button" onClick={() => onOpen(pick)} className="block w-full text-left min-h-11">
          <span className="block font-bold text-white leading-snug truncate">{pick.title}</span>
          <span className="block text-xs text-gray-100 truncate">
            {[pick.service, isMovie(pick) ? 'Movie' : 'TV', shared ? 'you both want it' : null].filter(Boolean).join(' · ')}
          </span>
        </button>
      </div>
      <button type="button" onClick={onAnother} disabled={poolSize < 2} aria-label="Another pick" title="Another pick" className={`${iconButton} bg-gray-900/60 disabled:opacity-50`}>
        <Shuffle size={18} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => onWatched(pick)} aria-label={`Mark ${pick.title} as watched`} title="Watched" className={`${iconButton} bg-green-700 hover:bg-green-800`}>
        <Check size={18} aria-hidden="true" />
      </button>
    </section>
  );
};

export default TonightsPick;
