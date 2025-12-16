// src/components/cards/ToWatchCard.jsx
import React, { useState, useEffect } from 'react';
import { Star, Trash2, Edit2, Check } from 'lucide-react';
import PriorityRating from '../common/PriorityRating';
import tmdbService from '../../services/tmdbService';

const ToWatchCard = ({ 
  item, 
  currentUser, 
  isEditing, 
  onToggleEdit, 
  onDelete, 
  onMarkWatched, 
  onSave,
  watchedEpisodes // New Prop: List of episodes user has already seen
}) => {
  // Local state for temporary changes
  const [localPriorities, setLocalPriorities] = useState({
    anthony: item.anthonyPriority || 0,
    pam: item.pamPriority || 0
  });

  // State for the calculated "Up Next" text
  const [upNextText, setUpNextText] = useState(null);

  // Sync local state when item updates from DB
  useEffect(() => {
    if (!isEditing) {
      setLocalPriorities({
        anthony: item.anthonyPriority || 0,
        pam: item.pamPriority || 0
      });
    }
  }, [item, isEditing]);

  // --- "Up Next" Calculation Logic ---
  useEffect(() => {
    const calculateUpNext = async () => {
      // 1. If it's a movie, no "Up Next"
      if (item.type === 'Movie' || item.mediaType === 'movie') return;

      // 2. If no history, assume S1 E1
      if (!watchedEpisodes || watchedEpisodes.length === 0) {
        setUpNextText("Up Next: S1 E1");
        return;
      }

      // 3. Find the absolute last watched episode
      const sortedEps = [...watchedEpisodes].sort((a, b) => {
        if (a.season !== b.season) return b.season - a.season;
        return b.num - a.num;
      });
      const lastWatched = sortedEps[0];
      
      if (!lastWatched) return;

      try {
        // 4. Fetch details for the CURRENT season to see how many eps it has
        const seasonData = await tmdbService.getSeasonDetails(item.tmdbId, lastWatched.season);
        
        if (seasonData && seasonData.episodes) {
          const totalEpsInSeason = seasonData.episodes.length;

          // Case A: There are more episodes in this season
          if (lastWatched.num < totalEpsInSeason) {
            setUpNextText(`Up Next: S${lastWatched.season} E${lastWatched.num + 1}`);
          } 
          // Case B: Season finished, check if next season exists
          else {
            const nextSeasonNum = lastWatched.season + 1;
            // Quick fetch to see if next season exists
            const nextSeasonData = await tmdbService.getSeasonDetails(item.tmdbId, nextSeasonNum);
            
            if (nextSeasonData && nextSeasonData.episodes && nextSeasonData.episodes.length > 0) {
              setUpNextText(`Up Next: S${nextSeasonNum} E1`);
            } else {
              setUpNextText(null); // Show is likely finished/caught up
            }
          }
        }
      } catch (error) {
        console.error("Failed to calc Up Next", error);
        // Fallback to naive math if API fails
        setUpNextText(`Up Next: S${lastWatched.season} E${lastWatched.num + 1}?`);
      }
    };

    calculateUpNext();
  }, [item.tmdbId, watchedEpisodes]); // Re-run if history changes

  const handlePriorityChange = (user, value) => {
    setLocalPriorities(prev => ({
      ...prev,
      [user]: value
    }));
  };

  const handleDone = () => {
    onSave(item.id, {
      anthonyPriority: localPriorities.anthony,
      pamPriority: localPriorities.pam
    });
  };

  const avgNum = ((localPriorities.anthony || 0) + (localPriorities.pam || 0)) / 2;
  const roundedAvg = Math.round(avgNum);
  
  // Determine Color based on Average
  let statusColor = "text-gray-400";
  if (avgNum >= 2.5) statusColor = "text-red-500";
  else if (avgNum >= 1.5) statusColor = "text-yellow-500";
  else if (avgNum > 0) statusColor = "text-blue-500";

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-3 border border-gray-700 overflow-hidden">
      {item.posterPath && (
        <div className="flex gap-3 mb-3">
          <img 
            src={item.posterPath} 
            alt={item.title}
            className="w-20 h-28 object-cover rounded"
          />
          <div className="flex-1">
            <div className="flex flex-col">
              <h3 className="font-semibold text-lg text-white leading-tight">{item.title}</h3>
              {/* Render the calculated text */}
              {upNextText && (
                <span className="text-xs font-semibold text-blue-400 mt-1">
                  {upNextText}
                </span>
              )}
            </div>
            
            {item.year && <p className="text-sm text-gray-400 mt-1">{item.year}</p>}
            
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
      
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          {/* Fallback layout if no poster */}
          {!item.posterPath && (
            <div className="mb-2">
              <h3 className="font-semibold text-lg text-white">{item.title}</h3>
              {upNextText && <span className="text-xs font-semibold text-blue-400">{upNextText}</span>}
            </div>
          )}
          
          <div className="flex gap-2 text-sm mt-1 flex-wrap">
            <span className="bg-blue-900 text-blue-300 px-2 py-0.5 rounded">{item.type}</span>
            <span className="bg-purple-900 text-purple-300 px-2 py-0.5 rounded">{item.service}</span>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-end">
            <PriorityRating rating={roundedAvg} editable={false} />
            <div className="text-xs text-gray-400 mt-1">avg priority</div>
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
          <div className="text-xs text-gray-400 mb-1">Anthony's Priority</div>
          <PriorityRating 
            rating={localPriorities.anthony} 
            editable={isEditing && currentUser === 'Anthony'} 
            onRate={(r) => handlePriorityChange('anthony', r)}
          />
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Pam's Priority</div>
          <PriorityRating 
            rating={localPriorities.pam} 
            editable={isEditing && currentUser === 'Pam'} 
            onRate={(r) => handlePriorityChange('pam', r)}
          />
        </div>
      </div>
      
      <div className="flex gap-2 mt-3">
        <button 
          onClick={isEditing ? handleDone : onToggleEdit}
          className="flex-1 bg-gray-700 text-gray-200 py-2 rounded hover:bg-gray-600 flex items-center justify-center gap-2"
        >
          <Edit2 size={16} />
          {isEditing ? 'Done' : 'Edit Priority'}
        </button>
        <button 
          onClick={() => onMarkWatched(item)}
          className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 flex items-center justify-center gap-2"
        >
          <Check size={16} />
          Mark Watched
        </button>
      </div>
    </div>
  );
};

export default ToWatchCard;