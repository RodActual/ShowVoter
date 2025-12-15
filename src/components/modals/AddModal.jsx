import React, { useState, useEffect } from 'react';
import { Search, X, Star } from 'lucide-react';
import tmdbService from '../../services/tmdbService'; // adjust path if needed

const AddModal = ({ onClose, onAdd }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedShow, setSelectedShow] = useState(null);
  const [availableServices, setAvailableServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Debounced Search
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setSearching(true);
        const results = await tmdbService.search(searchQuery);
        setSearchResults(results);
        setSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  const handleSelectShow = async (show) => {
    setSelectedShow(show);
    setLoadingServices(true);
    const providers = await tmdbService.getStreamingProviders(show.tmdbId, show.mediaType);
    setAvailableServices(providers);
    setLoadingServices(false);
  };

  const handleConfirmAdd = (serviceName) => {
    onAdd(selectedShow, serviceName);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Add to Watch List</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X size={24} />
          </button>
        </div>

        {/* Search Input */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a movie or TV show..."
              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
        </div>

        {searching && <div className="text-center py-4 text-gray-400">Searching...</div>}

        {/* Results List */}
        {!selectedShow && searchResults.length > 0 && (
          <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
            {searchResults.map(result => (
              <div
                key={result.id}
                onClick={() => handleSelectShow(result)}
                className="flex gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition"
              >
                {result.posterPath ? (
                  <img src={result.posterPath} alt={result.title} className="w-16 h-24 object-cover rounded" />
                ) : (
                  <div className="w-16 h-24 bg-gray-600 rounded flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No image</span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{result.title}</h3>
                  <p className="text-sm text-gray-400">{result.year} • {result.type}</p>
                  {result.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={12} className="fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-gray-300">{result.rating}/10</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{result.overview}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Item & Service Selection */}
        {selectedShow && (
          <div className="space-y-4">
            <div className="flex gap-3 p-3 bg-gray-700 rounded-lg">
              {selectedShow.posterPath && (
                <img src={selectedShow.posterPath} alt={selectedShow.title} className="w-20 h-28 object-cover rounded" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-white text-lg">{selectedShow.title}</h3>
                <p className="text-sm text-gray-400">{selectedShow.year} • {selectedShow.type}</p>
              </div>
              <button onClick={() => { setSelectedShow(null); setAvailableServices([]); }} className="text-gray-400 hover:text-gray-200">
                <X size={20} />
              </button>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">Where will you watch it?</h3>
              {loadingServices ? (
                <div className="text-center py-4 text-gray-400">Loading streaming services...</div>
              ) : availableServices.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {availableServices.map(service => (
                      <button
                        key={service.id}
                        onClick={() => handleConfirmAdd(service.name)}
                        className="flex items-center gap-2 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                      >
                        {service.logo && <img src={service.logo} alt={service.name} className="w-8 h-8 rounded" />}
                        <span className="text-white text-sm">{service.name}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 text-center mb-2">or select manually:</p>
                </>
              ) : (
                <p className="text-sm text-gray-400 mb-3">Select a streaming service:</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                {['Netflix', 'Hulu', 'Disney+', 'Max', 'Prime Video', 'Apple TV+', 'Paramount+', 'Other'].map(service => (
                  <button
                    key={service}
                    onClick={() => handleConfirmAdd(service)}
                    className="p-3 bg-blue-900 bg-opacity-40 hover:bg-opacity-60 text-blue-300 rounded-lg transition border border-blue-800"
                  >
                    {service}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddModal;