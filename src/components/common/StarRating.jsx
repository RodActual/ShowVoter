import React, { useState } from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ rating, maxStars = 10, onRate, editable = false, size = 20 }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const isInteractive = editable;
  
  return (
    <div className={`flex gap-1 ${!isInteractive ? 'opacity-90' : ''}`}>
      {[...Array(maxStars)].map((_, i) => (
        <Star
          key={i}
          size={size}
          className={`${i < (isInteractive && hoverRating ? hoverRating : rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'} ${isInteractive ? 'cursor-pointer hover:fill-yellow-300 transition-all' : 'cursor-default'}`}
          onClick={() => isInteractive && onRate && onRate(i + 1)}
          onMouseEnter={() => isInteractive && setHoverRating(i + 1)}
          onMouseLeave={() => isInteractive && setHoverRating(0)}
        />
      ))}
    </div>
  );
};

export default StarRating;