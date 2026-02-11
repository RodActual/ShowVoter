import React from 'react';
import { User } from 'lucide-react';

const UserSelectModal = ({ onSelectUser, settings }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full border border-gray-700 text-center">
        <User size={64} className="mx-auto mb-4 text-blue-400" />
        <h2 className="text-3xl font-bold text-white mb-2">Who's watching?</h2>
        <p className="text-gray-400 mb-8">Select your profile to continue</p>
        
        <div className="space-y-3">
          <button
            onClick={() => onSelectUser(settings.user1Name)}
            style={{ backgroundColor: settings.user1Color }}
            className="w-full text-white py-4 px-6 rounded-lg hover:opacity-90 font-semibold text-lg transition"
          >
            {settings.user1Name}
          </button>
          <button
            onClick={() => onSelectUser(settings.user2Name)}
            style={{ backgroundColor: settings.user2Color }}
            className="w-full text-white py-4 px-6 rounded-lg hover:opacity-90 font-semibold text-lg transition"
          >
            {settings.user2Name}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserSelectModal;