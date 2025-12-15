import React from 'react';
import { Trash2, Edit2, ChevronUp, ChevronDown } from 'lucide-react';
import StarRating from '../common/StarRating';

const WatchedCard = ({ 
  item, 
  currentUser, 
  isEditing, 
  onToggleEdit, 
  onDelete, 
  expandedShow, 
  setExpandedShow,
  onUpdateShowRating,
  onUpdateEpisodeRating 
}) => {
  const isExpanded = expandedShow === item.id;
  const anthony = item.anthonyRating || 0;
  const pam = item.pamRating || 0;
  const avgRating = pam ? ((anthony + pam) / 2).toFixed(1) : anthony;
  
  // Group episodes by season
  const episodesBySeason = item.episodes ? item.episodes.reduce((acc, ep) => {
    const s = ep.season || 1;
    if (!acc[s]) acc[s] = [];
    acc[s].push(ep);
    return acc;
  }, {}) : {};

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-3 border border-gray-700">
      {item.posterPath && (
        <div className="flex gap-3 mb-3">
          <img 
            src={item.posterPath} 
            alt={item.title}
            className="w-20 h-28 object-cover rounded"
          />
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-white">{item.title}</h3>
            {item.year && <p className="text-sm text-gray-400">{item.year}</p>}
            <div className="flex gap-2 text-sm mt-1 flex-wrap">
              <span className="bg-blue-900 text-blue-300 px-2 py-0.5 rounded">{item.type}</span>
              <span className="bg-purple-900 text-purple-300 px-2 py-0.5 rounded">{item.service}</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-start mb-3 pt-3 border-t border-gray-700">
        <div>
          {!item.posterPath && (
            <>
              <h3 className="font-semibold text-lg text-white">{item.title}</h3>
              <div className="flex gap-2 text-sm mt-1 flex-wrap">
                <span className="bg-blue-900 text-blue-300 px-2 py-0.5 rounded">{item.type}</span>
                <span className="bg-purple-900 text-purple-300 px-2 py-0.5 rounded">{item.service}</span>
              </div>
            </>
          )}
          <span className="text-gray-400 text-sm">Watched {item.watchedDate}</span>
        </div>
        
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-end">
            <div className="text-lg font-bold text-green-400 mb-1">{avgRating}/10</div>
            <StarRating rating={Math.round(Number(avgRating))} size={16} />
            <div className="text-xs text-gray-400 mt-1">avg rating</div>
          </div>
          
          <button 
            onClick={() => onDelete(item.id)}
            className="text-red-400 hover:text-red-300 p-1 ml-2"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-700">
        <div>
          <div className="text-xs text-gray-400 mb-1">Anthony's Rating</div>
          <StarRating 
            rating={anthony} 
            editable={isEditing && currentUser === 'Anthony'} 
            onRate={(rating) => onUpdateShowRating(item.id, 'anthonyRating', rating)}
          />
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Pam's Rating</div>
          <StarRating 
            rating={pam} 
            editable={isEditing && currentUser === 'Pam'} 
            onRate={(rating) => onUpdateShowRating(item.id, 'pamRating', rating)}
          />
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button 
          onClick={onToggleEdit}
          className="flex-1 bg-gray-700 text-gray-200 py-2 rounded hover:bg-gray-600 flex items-center justify-center gap-2"
        >
          <Edit2 size={16} />
          {isEditing ? 'Done' : 'Edit Rating'}
        </button>
      </div>

      {item.episodes && (
        <div className="mt-3 border-t border-gray-700 pt-2">
          <div className="flex justify-between items-center">
            <button 
              onClick={() => setExpandedShow(isExpanded ? null : item.id)}
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 w-full justify-center py-2"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {isExpanded ? 'Hide' : 'Show'} Episodes ({item.episodes.length})
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
                          <div>
                            <span className="font-medium text-white">
                              {ep.season ? `E${ep.num}` : `Episode ${ep.num}`}: {ep.title}
                            </span>
                            <div className="text-sm text-gray-400">{ep.title}</div>
                          </div>
                          <div className="text-sm font-semibold text-gray-300">
                            {(((ep.anthonyRating || 0) + (ep.pamRating || 0)) / 2).toFixed(1)}/10
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="text-gray-400 mb-1">Anthony: {ep.anthonyRating}/10</div>
                            <StarRating 
                              rating={ep.anthonyRating} 
                              maxStars={10}
                              size={16}
                              editable={isEditing && currentUser === 'Anthony'} 
                              onRate={(rating) => onUpdateEpisodeRating(item.id, {num: ep.num, season: ep.season}, 'Anthony', rating)}
                            />
                          </div>
                          <div>
                            <div className="text-gray-400 mb-1">Pam: {ep.pamRating}/10</div>
                            <StarRating 
                              rating={ep.pamRating} 
                              maxStars={10}
                              size={16}
                              editable={isEditing && currentUser === 'Pam'} 
                              onRate={(rating) => onUpdateEpisodeRating(item.id, {num: ep.num, season: ep.season}, 'Pam', rating)}
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