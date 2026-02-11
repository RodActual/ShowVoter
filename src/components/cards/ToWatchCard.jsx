import React, { useState, useEffect } from 'react';
import { Star, Trash2, Edit2, Check, ExternalLink, Play } from 'lucide-react';
import PriorityRating from '../common/PriorityRating';
import tmdbService from '../../services/tmdbService';

const ToWatchCard = ({ 
  item, 
  currentUser, 
  settings, // Contains user1Name, user1Color, etc.
  isEditing, 
  onToggleEdit, 
  onDelete, 
  onMarkWatched, 
  onSave,
  onPlayTrailer, 
  watchedEpisodes
}) => {
  // Local state for temporary changes (Batch Saving)
  const [localPriorities, setLocalPriorities] = useState({
    anthony: item.anthonyPriority || 0,
    pam: item.pamPriority || 0
  });
  
  const [upNextText, setUpNextText] = useState(null);
  const [releaseCountdown, setReleaseCountdown] = useState(null);

  // Sync DB to Local when not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalPriorities({
        anthony: item.anthonyPriority || 0,
        pam: item.pamPriority || 0
      });
    }
  }, [item, isEditing]);

  // Release Date Countdown Logic
  useEffect(() => {
    if (item.releaseDate) {
      const release = new Date(item.releaseDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      release.setHours(0, 0, 0, 0);
      
      const diffTime = release - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (diffDays > 0) {
        setReleaseCountdown(diffDays === 1 ? 'Opens Tomorrow!' : `In Theaters in ${diffDays} days`);
      } else {
        setReleaseCountdown(null);
      }
    }
  }, [item.releaseDate]);

  // "Up Next" Prediction Logic
  useEffect(() => {
    const calculateUpNext = async () => {
      if (item.type === 'Movie' || item.mediaType === 'movie') return;
      if (!watchedEpisodes || watchedEpisodes.length === 0) {
        setUpNextText("Up Next: S1 E1");
        return;
      }

      const sortedEps = [...watchedEpisodes].sort((a, b) => {
        if (a.season !== b.season) return b.season - a.season;
        return b.num - a.num;
      });
      const lastWatched = sortedEps[0];
      if (!lastWatched) return;

      try {
        const seasonData = await tmdbService.getSeasonDetails(item.tmdbId, lastWatched.season);
        if (seasonData && seasonData.episodes) {
          const totalEpsInSeason = seasonData.episodes.length;
          if (lastWatched.num < totalEpsInSeason) {
            setUpNextText(`Up Next: S${lastWatched.season} E${lastWatched.num + 1}`);
          } else {
            const nextSeasonNum = lastWatched.season + 1;
            const nextSeasonData = await tmdbService.getSeasonDetails(item.tmdbId, nextSeasonNum);
            if (nextSeasonData && nextSeasonData.episodes && nextSeasonData.episodes.length > 0) {
              setUpNextText(`Up Next: S${nextSeasonNum} E1`);
            } else {
              setUpNextText(null); // Show likely finished
            }
          }
        }
      } catch (error) {
        setUpNextText(`Up Next: S${lastWatched.season} E${lastWatched.num + 1}?`);
      }
    };
    calculateUpNext();
  }, [item.tmdbId, watchedEpisodes, item.type, item.mediaType]);

  const handlePriorityChange = (userKey, value) => {
    setLocalPriorities(prev => ({ ...prev, [userKey]: value }));
  };

  const handleDone = () => {
    onSave(item.id, {
      anthonyPriority: localPriorities.anthony,
      pamPriority: localPriorities.pam
    });
  };

  const avgNum = ((localPriorities.anthony || 0) + (localPriorities.pam || 0)) / 2;
  const roundedAvg = Math.round(avgNum);

  // Deep Link
  const getSearchLink = () => {
    const query = encodeURIComponent(`watch ${item.title} on ${item.service}`);
    return `https://www.google.com/search?q=${query}`;
  };

  // Determine which user added it for badge color
  const isUser1Added = item.addedBy === settings.user1Name;
  const addedBadgeColor = isUser1Added ? settings.user1Color : settings.user2Color;

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-3 border border-gray-700 overflow-hidden relative">
      
      {/* "Who Picked This" Badge with Dynamic Color */}
      {item.addedBy && (
        <div 
          className="absolute top-0 right-0 px-2 py-1 text-[10px] font-bold rounded-bl-lg z-10 text-white shadow-sm"
          style={{ backgroundColor: addedBadgeColor }}
        >
          {item.addedBy}
        </div>
      )}

      {item.posterPath && (
        <div className="flex gap-3 mb-3">
          <div className="relative">
            <img src={item.posterPath} alt={item.title} className="w-20 h-28 object-cover rounded" />
            <button 
              onClick={() => onPlayTrailer(item)}
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-50 transition group"
            >
              <div className="bg-white bg-opacity-80 rounded-full p-1.5 shadow-lg group-hover:scale-110 transition transform">
                <Play size={14} className="text-black fill-black ml-0.5" />
              </div>
            </button>
          </div>

          <div className="flex-1 pt-4">
            <div className="flex flex-col">
              <h3 className="font-semibold text-lg text-white leading-tight pr-6">{item.title}</h3>
              {releaseCountdown ? (
                <span className="text-xs font-bold text-yellow-400 mt-1 uppercase tracking-wide">{releaseCountdown}</span>
              ) : (
                upNextText && <span className="text-xs font-semibold text-blue-400 mt-1">{upNextText}</span>
              )}
            </div>
            
            {item.year && !releaseCountdown && <p className="text-sm text-gray-400 mt-1">{item.year}</p>}
            
            {item.rating && (
              <div className="flex items-center gap-1 mt-1">
                <Star size={14} className="fill-yellow-400 text-yellow-400" />
                <span className="text-sm text-gray-300">{item.rating}/10 TMDB</span>
              </div>
            )}
            
            {item.isNewEpisodes && (
              <span className="bg-green-600 text-white text-xs px-2 py-1 rounded mt-2 inline-block font-bold shadow-sm">
                New Episodes
              </span>
            )}
          </div>
        </div>
      )}
      
      {!item.posterPath && (
        <div className="mb-2 pr-8">
          <h3 className="font-semibold text-lg text-white">{item.title}</h3>
          {upNextText && <span className="text-xs font-semibold text-blue-400">{upNextText}</span>}
        </div>
      )}
      
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex gap-2 text-sm mt-1 flex-wrap items-center">
            <span className="bg-blue-900 text-blue-300 px-2 py-0.5 rounded">{item.type}</span>
            <a 
              href={getSearchLink()} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-0.5 rounded transition cursor-pointer text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              {item.service} <ExternalLink size={10} />
            </a>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-end">
            <PriorityRating rating={roundedAvg} editable={false} />
            <div className="text-xs text-gray-400 mt-1">avg priority</div>
          </div>
          <button onClick={() => onDelete(item.id)} className="text-red-400 hover:text-red-300 p-1 ml-2">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {/* Priority Sliders with Dynamic Names & Colors */}
      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-700">
        <div>
          <div className="text-xs font-bold mb-1" style={{ color: settings.user1Color }}>
            {settings.user1Name}
          </div>
          <PriorityRating 
            rating={localPriorities.anthony} 
            editable={isEditing && currentUser === settings.user1Name} 
            onRate={(r) => handlePriorityChange('anthony', r)}
          />
        </div>
        <div>
          <div className="text-xs font-bold mb-1" style={{ color: settings.user2Color }}>
            {settings.user2Name}
          </div>
          <PriorityRating 
            rating={localPriorities.pam} 
            editable={isEditing && currentUser === settings.user2Name} 
            onRate={(r) => handlePriorityChange('pam', r)}
          />
        </div>
      </div>
      
      <div className="flex gap-2 mt-3">
        <button 
          onClick={isEditing ? handleDone : onToggleEdit}
          className="flex-1 bg-gray-700 text-gray-200 py-2 rounded hover:bg-gray-600 flex items-center justify-center gap-2"
        >
          <Edit2 size={16} /> {isEditing ? 'Done' : 'Priority'}
        </button>
        <button 
          onClick={() => onMarkWatched(item)}
          className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 flex items-center justify-center gap-2"
        >
          <Check size={16} /> Watched
        </button>
      </div>
    </div>
  );
};

export default ToWatchCard;