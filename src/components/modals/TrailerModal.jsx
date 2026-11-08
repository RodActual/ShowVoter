import React from 'react';
import Modal from '../common/Modal';

const TrailerModal = ({ videoKey, title, onClose }) => {
  if (!videoKey) return null;
  return (
    <Modal title={title ? `Trailer: ${title}` : 'Trailer'} onClose={onClose} maxWidth="max-w-4xl" padded={false}>
      <div className="aspect-video w-full bg-black">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${encodeURIComponent(videoKey)}?autoplay=1`}
          title={title ? `${title} trailer` : 'Trailer'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </Modal>
  );
};

export default TrailerModal;
