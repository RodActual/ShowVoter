import React from 'react';

const PriorityRating = ({ rating, editable, onRate }) => {
  const levels = [1, 2, 3];
  
  const getColor = (level) => {
      if (rating < level) return "bg-gray-700";
      if (rating === 1) return "bg-blue-500";
      if (rating === 2) return "bg-yellow-500";
      return "bg-red-500";
  };

  const getLabel = () => {
      if (rating === 1) return "Low";
      if (rating === 2) return "Med";
      if (rating === 3) return "High";
      return "None";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
          {levels.map((level) => (
          <div
              key={level}
              onClick={() => editable && onRate(level)}
              className={`
              h-3 w-6 rounded-sm transition-all
              ${getColor(level)}
              ${editable ? 'cursor-pointer hover:opacity-80' : 'opacity-90'}
              `}
          />
          ))}
      </div>
      <span className={`text-xs font-medium ${
          rating === 1 ? 'text-blue-400' : 
          rating === 2 ? 'text-yellow-400' : 
          rating === 3 ? 'text-red-400' : 'text-gray-500'
      }`}>
          {getLabel()}
      </span>
    </div>
  );
};

export default PriorityRating;