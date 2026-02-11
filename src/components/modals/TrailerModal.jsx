import React from 'react';
import { X } from 'lucide-react';

const TrailerModal = ({ videoKey, onClose }) => {
  if (!videoKey) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
      <div className="relative w-full max-w-4xl bg-black rounded-lg overflow-hidden border border-gray-800 shadow-2xl">
        <div className="flex justify-between items-center p-3 bg-gray-900 border-b border-gray-800">
          <h3 className="text-white font-medium">Trailer</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>
        <div className="aspect-video w-full">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${videoKey}?autoplay=1`}
            title="Trailer"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default TrailerModal;