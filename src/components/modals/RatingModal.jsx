import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react';
import StarRating from '../common/StarRating';
import tmdbService from '../../services/tmdbService';

const RatingModal = ({ item, currentUser, watchedHistory, onClose, onSubmit }) => {
  const [anthonyRating, setAnthonyRating] = useState(3);
  const [pamRating, setPamRating] = useState(3);
  const [numEpisodes, setNumEpisodes] = useState(0);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [expandedSeason, setExpandedSeason] = useState(1);

  useEffect(() => {
    if (item?.tmdbId && (item?.type === 'TV Show' || item?.mediaType === 'tv')) {
      handleLoadEpisodesFromTMDB();
    }
  }, [item]);

  const handleLoadEpisodesFromTMDB = async () => {
    setLoadingEpisodes(true);
    try {
      const details = await tmdbService.getDetails(item.tmdbId, 'tv');
      let totalSeasons = details?.numberOfSeasons || 1;

      // 1. Identify already watched episodes
      const existingShow = watchedHistory.find(
        w => w.tmdbId === item.tmdbId && w.mediaType === item.mediaType
      );
      const watchedSet = new Set();
      if (existingShow?.episodes) {
        existingShow.episodes.forEach(ep => watchedSet.add(`${ep.season}-${ep.num}`));
      }

      let allEpisodes = [];
      // 2. Fetch all seasons
      for (let i = 1; i <= totalSeasons; i++) {
        const seasonData = await tmdbService.getSeasonDetails(item.tmdbId, i);
        if (seasonData?.episodes) {
          const currentSeasonEps = seasonData.episodes
            // 3. Filter OUT previously watched episodes
            .filter(ep => {
              const epNum = ep.num || ep.episode_number;
              return !watchedSet.has(`${i}-${epNum}`);
            })
            .map((ep, index) => ({
              season: i,
              num: ep.num || ep.episode_number || (index + 1),
              title: ep.title || ep.name || `Episode ${index + 1}`,
              anthonyRating: 5,
              pamRating: 5,
              isSelected: true
            }));
          allEpisodes = [...allEpisodes, ...currentSeasonEps];
        }
      }

      if (allEpisodes.length > 0) {
        setEpisodes(allEpisodes);
        setExpandedSeason(allEpisodes[0].season);
      } else if (watchedSet.size === 0) {
        // Only default to manual if truly no data found AND no history
        handleAddEpisodesManually();
      }
    } catch (error) {
      console.error('Error loading episodes:', error);
      handleAddEpisodesManually();
    }
    setLoadingEpisodes(false);
  };

  const handleAddEpisodesManually = () => {
    const newEps = Array.from({ length: numEpisodes }, (_, i) => ({
      num: i + 1,
      title: `Episode ${i + 1}`,
      anthonyRating: 5,
      pamRating: 5,
      isSelected: true
    }));
    setEpisodes(newEps);
  };

  // --- Handlers for episode interaction ---
  const handleEpisodeRatingChange = (epNum, seasonNum, user, rating) => {
    setEpisodes(prev => prev.map(ep =>
      (ep.num === epNum && (ep.season === seasonNum || !ep.season))
        ? { ...ep, [user === 'Anthony' ? 'anthonyRating' : 'pamRating']: rating }
        : ep
    ));
  };

  const toggleEpisodeSelection = (epNum, seasonNum) => {
    setEpisodes(prev => prev.map(ep => 
      (ep.num === epNum && (ep.season === seasonNum || !ep.season))
        ? { ...ep, isSelected: !ep.isSelected }
        : ep
    ));
  };

  const toggleSeasonSelection = (seasonNum, select) => {
    setEpisodes(prev => prev.map(ep => 
      ep.season === seasonNum ? { ...ep, isSelected: select } : ep
    ));
  };

  const toggleAllSelection = (select) => {
    setEpisodes(prev => prev.map(ep => ({ ...ep, isSelected: select })));
  };

  const episodesBySeason = episodes.length > 0 ? episodes.reduce((acc, ep) => {
    const s = ep.season || 1;
    if (!acc[s]) acc[s] = [];
    acc[s].push(ep);
    return acc;
  }, {}) : {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Rate: {item?.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X size={24} /></button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-700 p-4 rounded">
            <h3 className="font-semibold mb-3 text-white">Overall Rating (1-10 stars)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-300 mb-2">Anthony's Rating</div>
                <StarRating rating={anthonyRating} editable={currentUser === 'Anthony'} onRate={setAnthonyRating} size={28} />
              </div>
              <div>
                <div className="text-sm text-gray-300 mb-2">Pam's Rating</div>
                <StarRating rating={pamRating} editable={currentUser === 'Pam'} onRate={setPamRating} size={28} />
              </div>
            </div>
          </div>

          {(item?.type === 'TV Show' || item?.mediaType === 'tv') && (
            <div className="bg-blue-900 bg-opacity-40 p-4 rounded border border-blue-800">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-white">Episodes (Unwatched)</h3>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => toggleAllSelection(true)} className="text-blue-300 hover:text-blue-200 underline">Select All</button>
                  <span className="text-gray-500">|</span>
                  <button onClick={() => toggleAllSelection(false)} className="text-blue-300 hover:text-blue-200 underline">Deselect All</button>
                </div>
              </div>
              
              {loadingEpisodes ? (
                <div className="text-center text-gray-300 py-4">Loading seasons and episodes...</div>
              ) : episodes.length === 0 ? (
                <div>
                  <label className="text-sm text-gray-300 block mb-2">No new episodes found.</label>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-600">
                    <p className="text-xs text-gray-400 self-center">Add manually?</p>
                    <input type="number" min="0" max="50" value={numEpisodes} onChange={(e) => setNumEpisodes(parseInt(e.target.value) || 0)} className="border border-gray-600 rounded px-3 py-2 w-24 bg-gray-700 text-white" />
                    <button onClick={handleAddEpisodesManually} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add Manual</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {Object.keys(episodesBySeason).map(seasonNum => {
                    const seasonInt = parseInt(seasonNum);
                    const allSelected = episodesBySeason[seasonNum].every(ep => ep.isSelected);
                    return (
                      <div key={seasonNum} className="border border-gray-600 rounded overflow-hidden">
                        <div className="w-full flex justify-between items-center p-3 bg-gray-700 hover:bg-gray-600 transition">
                          <div className="flex items-center gap-3">
                            <button onClick={(e) => { e.stopPropagation(); toggleSeasonSelection(seasonInt, !allSelected); }} className="text-white hover:text-blue-300">
                              {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                            <button onClick={() => setExpandedSeason(expandedSeason === seasonInt ? null : seasonInt)} className="font-bold text-white flex-1 text-left">
                              Season {seasonNum}
                            </button>
                          </div>
                          <button onClick={() => setExpandedSeason(expandedSeason === seasonInt ? null : seasonInt)}>
                            {expandedSeason === seasonInt ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                        {expandedSeason === seasonInt && (
                          <div className="p-3 space-y-3 bg-gray-800">
                            {episodesBySeason[seasonNum].map(ep => (
                              <div key={`${ep.season}-${ep.num}`} className={`p-3 rounded border ${ep.isSelected ? 'bg-gray-700 border-gray-600' : 'bg-gray-800 border-gray-700 opacity-60'}`}>
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-start gap-3">
                                    <button onClick={() => toggleEpisodeSelection(ep.num, ep.season)} className="mt-1 text-white hover:text-blue-300">
                                      {ep.isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                    </button>
                                    <span className="font-medium text-white">{ep.season ? `E${ep.num}` : `Episode ${ep.num}`}: {ep.title}</span>
                                  </div>
                                </div>
                                {ep.isSelected && (
                                  <div className="grid grid-cols-2 gap-3 text-xs pl-7">
                                    <div><div className="text-gray-300 mb-1">Anthony</div><StarRating rating={ep.anthonyRating} maxStars={10} size={18} editable={currentUser === 'Anthony'} onRate={(r) => handleEpisodeRatingChange(ep.num, ep.season, 'Anthony', r)} /></div>
                                    <div><div className="text-gray-300 mb-1">Pam</div><StarRating rating={ep.pamRating} maxStars={10} size={18} editable={currentUser === 'Pam'} onRate={(r) => handleEpisodeRatingChange(ep.num, ep.season, 'Pam', r)} /></div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={() => onSubmit(anthonyRating, pamRating, episodes)} className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium">Save & Mark as Watched</button>
      </div>
    </div>
  );
};

export default RatingModal;