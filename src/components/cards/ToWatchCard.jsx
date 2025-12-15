import React from 'react';
import { Star, Trash2, Edit2, Check } from 'lucide-react';
import PriorityRating from '../common/PriorityRating';

const ToWatchCard = ({ 
  item, 
  currentUser, 
  isEditing, 
  onToggleEdit, 
  onDelete, 
  onMarkWatched, 
  onUpdatePriority 
}) => {
  // Calculate average for display
  const avgNum = ((item.anthonyPriority || 0) + (item.pamPriority || 0)) / 2;
  const roundedAvg = Math.round(avgNum);
  
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
            <h3 className="font-semibold text-lg text-white">{item.title}</h3>
            {item.year && <p className="text-sm text-gray-400">{item.year}</p>}
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
          {!item.posterPath && <h3 className="font-semibold text-lg text-white">{item.title}</h3>}
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
            rating={item.anthonyPriority || 0} 
            editable={isEditing && currentUser === 'Anthony'} 
            onRate={(rating) => onUpdatePriority(item.id, 'anthonyPriority', rating)}
          />
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Pam's Priority</div>
          <PriorityRating 
            rating={item.pamPriority || 0} 
            editable={isEditing && currentUser === 'Pam'} 
            onRate={(rating) => onUpdatePriority(item.id, 'pamPriority', rating)}
          />
        </div>
      </div>
      
      <div className="flex gap-2 mt-3">
        <button 
          onClick={onToggleEdit}
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