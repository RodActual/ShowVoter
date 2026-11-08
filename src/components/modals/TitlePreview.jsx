import React, { useEffect, useState } from 'react';
import { Play, Plus, Star, Check } from 'lucide-react';
import Modal from '../common/Modal';
import tmdbService from '../../services/tmdbService';

// Preview of a title that isn't on your lists yet: overview, where it streams, trailer, Add.
const TitlePreview = ({ title, listed, because, onClose, onAdd, onTrailer }) => {
  const [providers, setProviders] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    tmdbService.getStreamingProviders(title.tmdbId, title.mediaType).then((p) => { if (!cancelled) setProviders(p); });
    return () => { cancelled = true; };
  }, [title]);

  const add = async () => {
    setAdding(true);
    try {
      await onAdd(title, providers?.[0]?.name || 'Other');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal title={title.title} onClose={onClose}>
      <div className="flex gap-4">
        {title.posterPath && <img src={title.posterPath} alt="" className="w-24 h-36 object-cover rounded-lg shrink-0 bg-gray-700" />}
        <div className="min-w-0 space-y-1 text-sm text-gray-100">
          <p>{[title.type, title.year].filter(Boolean).join(' · ')}</p>
          {title.rating && (
            <p className="flex items-center gap-1">
              <Star size={14} aria-hidden="true" className="fill-yellow-400 text-yellow-400" /> {title.rating}/10 on TMDB
            </p>
          )}
          <p>
            {providers === null ? 'Checking where to stream…'
              : providers.length ? `Streaming on ${providers.slice(0, 3).map((p) => p.name).join(', ')}`
                : 'Not streaming in the US right now'}
          </p>
          {because && <p className="text-purple-100">{because}</p>}
        </div>
      </div>
      {title.overview && <p className="text-sm text-gray-200 mt-3">{title.overview}</p>}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          type="button"
          onClick={() => onTrailer(title)}
          className="min-h-12 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold flex items-center justify-center gap-2"
        >
          <Play size={18} aria-hidden="true" /> Trailer
        </button>
        {listed ? (
          <p className="min-h-12 rounded-lg border border-gray-600 text-gray-100 font-semibold flex items-center justify-center gap-2">
            <Check size={18} aria-hidden="true" /> On your list
          </p>
        ) : (
          <button
            type="button"
            onClick={add}
            disabled={adding}
            className="min-h-12 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Plus size={18} aria-hidden="true" /> {adding ? 'Adding…' : 'Add to To Watch'}
          </button>
        )}
      </div>
    </Modal>
  );
};

export default TitlePreview;
