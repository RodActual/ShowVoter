import React from 'react';
import { Star } from 'lucide-react';

// Read-only display. Editing uses RatingPicker / RatingSelect, which are sized for touch.
const StarRating = ({ rating = 0, maxStars = 10, size = 14 }) => (
  <div className="flex gap-0.5" role="img" aria-label={rating ? `${rating} out of ${maxStars}` : 'Not rated'}>
    {Array.from({ length: maxStars }, (_, i) => (
      <Star
        key={i}
        size={size}
        aria-hidden="true"
        className={`shrink-0 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'}`}
      />
    ))}
  </div>
);

export default StarRating;
