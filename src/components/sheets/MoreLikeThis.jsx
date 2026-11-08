import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import tmdbService from '../../services/tmdbService';

// Horizontal strip of TMDB recommendations for one title. Tap a poster to preview it.
const MoreLikeThis = ({ item, isListed, onPreview }) => {
  const [results, setResults] = useState(null); // null = loading
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setResults(null);
    setError(false);
    tmdbService.recommendations(item.tmdbId, item.mediaType || (item.type === 'Movie' ? 'movie' : 'tv'))
      .then((r) => { if (!cancelled) setResults(r.slice(0, 15)); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [item.tmdbId, item.mediaType, item.type]);

  if (error) return <p className="text-sm text-red-200">Couldn't load suggestions.</p>;
  if (results === null) {
    return (
      <div role="status" aria-label="Loading suggestions" className="flex gap-3 overflow-hidden">
        {[0, 1, 2, 3].map((i) => <div key={i} className="w-24 h-36 shrink-0 rounded-lg bg-gray-700 animate-pulse" />)}
      </div>
    );
  }
  if (results.length === 0) return <p className="text-sm text-gray-200">No suggestions for this one yet.</p>;

  return (
    <ul className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
      {results.map((r) => {
        const listed = isListed(r);
        return (
          <li key={r.id} className="shrink-0 w-24">
            <button type="button" onClick={() => onPreview(r)} className="w-24 text-left" aria-label={`${r.title}${listed ? ' (on your list)' : ''}`}>
              <span className="relative block">
                <img src={r.posterPath} alt="" loading="lazy" className="w-24 h-36 object-cover rounded-lg bg-gray-700" />
                {listed && (
                  <span aria-hidden="true" className="absolute top-1 right-1 bg-green-700 text-white rounded-full p-1">
                    <Check size={12} />
                  </span>
                )}
              </span>
              <span aria-hidden="true" className="mt-1 text-xs text-gray-100 leading-tight line-clamp-2">{r.title}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default MoreLikeThis;
