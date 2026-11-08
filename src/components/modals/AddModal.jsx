import React, { useState, useEffect } from 'react';
import { Search, Star, ArrowLeft } from 'lucide-react';
import Modal from '../common/Modal';
import tmdbService from '../../services/tmdbService';

const MANUAL_SERVICES = ['Netflix', 'Hulu', 'Disney+', 'Max', 'Prime Video', 'Apple TV+', 'Paramount+', 'Peacock', 'Other'];

const AddModal = ({ onClose, onAdd }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchState, setSearchState] = useState('idle'); // idle | loading | done | error
  const [retryCount, setRetryCount] = useState(0);
  const [selectedShow, setSelectedShow] = useState(null);
  const [availableServices, setAvailableServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [adding, setAdding] = useState(false);

  // Debounced search; stale responses are ignored.
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchState('idle');
      return undefined;
    }
    let cancelled = false;
    setSearchState('loading');
    const timeout = setTimeout(async () => {
      try {
        const results = await tmdbService.search(query);
        if (!cancelled) { setSearchResults(results); setSearchState('done'); }
      } catch {
        if (!cancelled) { setSearchResults([]); setSearchState('error'); }
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [searchQuery, retryCount]);

  const handleSelectShow = async (show) => {
    setSelectedShow(show);
    setLoadingServices(true);
    setAvailableServices(await tmdbService.getStreamingProviders(show.tmdbId, show.mediaType));
    setLoadingServices(false);
  };

  const handleConfirmAdd = async (serviceName) => {
    setAdding(true);
    try {
      await onAdd(selectedShow, serviceName);
    } finally {
      setAdding(false);
    }
  };

  const serviceButton = 'flex items-center gap-2 px-3 min-h-11 rounded-lg transition text-left disabled:opacity-50';

  return (
    <Modal title={selectedShow ? `Add ${selectedShow.title}` : 'Add to watch list'} onClose={onClose}>
      {!selectedShow ? (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={20} aria-hidden="true" />
            <label htmlFor="add-search" className="sr-only">Search for a movie or TV show</label>
            <input
              id="add-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies and TV shows…"
              className="w-full pl-10 pr-4 min-h-12 bg-gray-700 border border-gray-500 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:border-blue-400"
              autoFocus
            />
          </div>

          <div aria-live="polite">
            {searchState === 'loading' && <p className="text-center py-4 text-gray-200">Searching…</p>}
            {searchState === 'error' && (
              <div className="text-center py-4">
                <p className="text-red-200 mb-2">Search failed. Check your connection or the server's TMDB key.</p>
                <button type="button" onClick={() => setRetryCount((n) => n + 1)} className="bg-gray-700 text-white px-4 min-h-11 rounded-lg">Try again</button>
              </div>
            )}
            {searchState === 'done' && searchResults.length === 0 && (
              <p className="text-center py-4 text-gray-200">No matches for “{searchQuery.trim()}”.</p>
            )}
          </div>

          {searchState === 'done' && searchResults.length > 0 && (
            <ul className="space-y-2">
              {searchResults.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectShow(result)}
                    className="w-full text-left flex gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
                  >
                    {result.posterPath ? (
                      <img src={result.posterPath} alt="" className="w-14 h-20 object-cover rounded shrink-0" />
                    ) : (
                      <div className="w-14 h-20 bg-gray-600 rounded shrink-0" aria-hidden="true" />
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-white">{result.title}</span>
                      <span className="block text-sm text-gray-200">{[result.year, result.type].filter(Boolean).join(' • ')}</span>
                      {result.rating && (
                        <span className="flex items-center gap-1 mt-1 text-xs text-gray-200">
                          <Star size={12} aria-hidden="true" className="fill-yellow-400 text-yellow-400" /> {result.rating}/10
                        </span>
                      )}
                      <span className="text-xs text-gray-200 mt-1 line-clamp-2">{result.overview}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => { setSelectedShow(null); setAvailableServices([]); }}
            className="flex items-center gap-2 text-blue-300 min-h-11"
          >
            <ArrowLeft size={18} aria-hidden="true" /> Back to results
          </button>

          <h3 className="text-white font-semibold">Where will you watch it?</h3>
          {loadingServices ? (
            <p className="text-center py-4 text-gray-200" role="status">Loading streaming services…</p>
          ) : availableServices.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {availableServices.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  disabled={adding}
                  onClick={() => handleConfirmAdd(service.name)}
                  className={`${serviceButton} bg-gray-700 hover:bg-gray-600 text-white text-sm`}
                >
                  {service.logo && <img src={service.logo} alt="" className="w-8 h-8 rounded" />}
                  {service.name}
                </button>
              ))}
            </div>
          )}

          <p className="text-sm text-gray-200">{availableServices.length > 0 ? 'Or pick one:' : 'Pick a service:'}</p>
          <div className="grid grid-cols-2 gap-2">
            {MANUAL_SERVICES.map((service) => (
              <button
                key={service}
                type="button"
                disabled={adding}
                onClick={() => handleConfirmAdd(service)}
                className={`${serviceButton} justify-center bg-blue-900/60 hover:bg-blue-900 text-blue-100 border border-blue-700`}
              >
                {service}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AddModal;
