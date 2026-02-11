import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, ChevronUp, ChevronDown, Ban } from 'lucide-react';
import StarRating from '../common/StarRating';

const WatchedCard = ({ 
  item, 
  currentUser, 
  settings, // Contains user1Name, user1Color, etc.
  isEditing, 
  onToggleEdit, 
  onDelete, 
  expandedShow, 
  setExpandedShow,
  onSave
}) => {
  const isExpanded = expandedShow === item.id;
  const isDNF = item.status === 'DNF'; // DNF Status Check
  
  // Local state for Batch Editing
  const [localRatings, setLocalRatings] = useState({
    anthony: item.anthonyRating || 0,
    pam: item.pamRating || 0
  });
  const [localEpisodes, setLocalEpisodes] = useState(item.episodes || []);

  useEffect(() => {
    if (!isEditing) {
      setLocalRatings({
        anthony: item.anthonyRating || 0,
        pam: item.pamRating || 0
      });
      setLocalEpisodes(item.episodes || []);
    }
  }, [item, isEditing]);

  const handleShowRatingChange = (userKey, value) => {
    setLocalRatings(prev => ({ ...prev, [userKey]: value }));
  };

  const handleEpisodeChange = (episodeNum, seasonNum, user, newRating) => {
    // 1. Update the specific episode in the local list
    const updatedEpisodes = localEpisodes.map(ep => {
      const isMatch = (ep.season === seasonNum && ep.num === episodeNum) || 
                      (!ep.season && ep.num === episodeNum);
      
      if (isMatch) {
        // Map user Name to DB Key (anthonyRating / pamRating)
        const dbField = user === settings.user1Name ? 'anthonyRating' : 'pamRating';
        return { ...ep, [dbField]: newRating };
      }
      return ep;
    });
    setLocalEpisodes(updatedEpisodes);

    // 2. Auto-recalculate Top Level Average for that user locally
    const dbField = user === settings.user1Name ? 'anthonyRating' : 'pamRating';
    const ratedEps = updatedEpisodes.filter(ep => (ep[dbField] || 0) > 0);
    
    if (ratedEps.length > 0) {
      const sum = ratedEps.reduce((acc, ep) => acc + (ep[dbField] || 0), 0);
      const newAvg = Math.round(sum / ratedEps.length);
      // Map user Name to Local State Key ('anthony' / 'pam')
      handleShowRatingChange(user === settings.user1Name ? 'anthony' : 'pam', newAvg);
    }
  };

  const handleDone = () => {
    onSave(item.id, {
      anthonyRating: localRatings.anthony,
      pamRating: localRatings.pam,
      episodes: localEpisodes
    });
  };

  const avgRating = localRatings.pam ? ((localRatings.anthony + localRatings.pam) / 2).toFixed(1) : localRatings.anthony;
  
  const episodesBySeason = localEpisodes.reduce((acc, ep) => {
    const s = ep.season || 1;
    if (!acc[s]) acc[s] = [];
    acc[s].push(ep);
    return acc;
  }, {});

  return (
    <div className={`rounded-lg shadow-lg p-4 mb-3 border ${isDNF ? 'bg-gray-800 border-red-900 opacity-75' : 'bg-gray-800 border-gray-700'}`}>
      <div className="flex gap-3 mb-3">
        {item.posterPath && (
          <img src={item.posterPath} alt={item.title} className={`w-20 h-28 object-cover rounded ${isDNF ? 'grayscale' : ''}`} />
        )}
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg text-white">{item.title}</h3>
              {item.year && <p className="text-sm text-gray-400">{item.year}</p>}
              
              {isDNF ? (
                <span className="inline-flex items-center gap-1 text-red-400 text-xs font-bold border border-red-900 px-2 py-0.5 rounded bg-red-900/20 mt-1">
                  <Ban size={12} /> DNF (Abandoned)
                </span>
              ) : (
                <span className="text-gray-400 text-sm mt-1 block">Watched {item.watchedDate}</span>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 text-sm mt-2 flex-wrap">
            <span className="bg-blue-900 text-blue-300 px-2 py-0.5 rounded">{item.type}</span>
            <span className="bg-purple-900 text-purple-300 px-2 py-0.5 rounded">{item.service}</span>
          </div>
        </div>
      </div>
      
      {!isDNF && (
        <div className="flex justify-between items-start mb-3 pt-3 border-t border-gray-700">
          <div className="flex items-center gap-1"></div>
          <div className="flex items-start gap-2">
            <div className="flex flex-col items-end">
              <div className="text-lg font-bold text-green-400 mb-1">{avgRating}/10</div>
              <StarRating rating={Math.round(Number(avgRating))} size={16} />
              <div className="text-xs text-gray-400 mt-1">avg rating</div>
            </div>
            <button onClick={() => onDelete(item.id)} className="text-red-400 hover:text-red-300 p-1 ml-2">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      {isDNF && (
        <div className="flex justify-end pt-2">
           <button onClick={() => onDelete(item.id)} className="text-red-400 hover:text-red-300 p-1">
              <Trash2 size={16} />
            </button>
        </div>
      )}
      
      {!isDNF && (
        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-700">
          <div>
            <div className="text-xs font-bold mb-1" style={{ color: settings.user1Color }}>{settings.user1Name}</div>
            <StarRating 
              rating={localRatings.anthony} 
              editable={isEditing && currentUser === settings.user1Name} 
              onRate={(r) => handleShowRatingChange('anthony', r)}
            />
          </div>
          <div>
            <div className="text-xs font-bold mb-1" style={{ color: settings.user2Color }}>{settings.user2Name}</div>
            <StarRating 
              rating={localRatings.pam} 
              editable={isEditing && currentUser === settings.user2Name} 
              onRate={(r) => handleShowRatingChange('pam', r)}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button 
          onClick={isEditing ? handleDone : onToggleEdit}
          className="flex-1 bg-gray-700 text-gray-200 py-2 rounded hover:bg-gray-600 flex items-center justify-center gap-2"
        >
          <Edit2 size={16} />
          {isEditing ? 'Done' : 'Edit Rating'}
        </button>
      </div>

      {!isDNF && localEpisodes.length > 0 && (
        <div className="mt-3 border-t border-gray-700 pt-2">
          <div className="flex justify-between items-center">
            <button 
              onClick={() => setExpandedShow(isExpanded ? null : item.id)}
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 w-full justify-center py-2"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {isExpanded ? 'Hide' : 'Show'} Episodes ({localEpisodes.length})
            </button>
          </div>
          
          {isExpanded && (
            <div className="mt-3 space-y-4">
              {Object.keys(episodesBySeason).map(seasonNum => (
                <div key={seasonNum}>
                  <h4 className="text-xs uppercase font-bold text-gray-500 mb-2 border-b border-gray-700 pb-1">
                    Season {seasonNum}
                  </h4>
                  <div className="space-y-2">
                    {episodesBySeason[seasonNum].map(ep => (
                      <div key={`${ep.season}-${ep.num}`} className="bg-gray-700 p-3 rounded">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-start gap-3">
                            <span className="font-medium text-white">
                              {ep.season ? `E${ep.num}` : `Episode ${ep.num}`}: {ep.title}
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-gray-300">
                            {(((ep.anthonyRating || 0) + (ep.pamRating || 0)) / 2).toFixed(1)}/10
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="mb-1" style={{ color: settings.user1Color }}>{settings.user1Name}</div>
                            <StarRating 
                              rating={ep.anthonyRating} 
                              maxStars={10} 
                              size={16}
                              editable={isEditing && currentUser === settings.user1Name} 
                              onRate={(r) => handleEpisodeChange(ep.num, ep.season, settings.user1Name, r)}
                            />
                          </div>
                          <div>
                            <div className="mb-1" style={{ color: settings.user2Color }}>{settings.user2Name}</div>
                            <StarRating 
                              rating={ep.pamRating} 
                              maxStars={10} 
                              size={16}
                              editable={isEditing && currentUser === settings.user2Name} 
                              onRate={(r) => handleEpisodeChange(ep.num, ep.season, settings.user2Name, r)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WatchedCard;