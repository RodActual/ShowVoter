import React from 'react';
import { User } from 'lucide-react';
import { userName } from '../../users';

const UserSelectModal = ({ onSelectUser, settings }) => (
  <main className="min-h-[100dvh] bg-gray-900 flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))]">
    <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full border border-gray-700 text-center">
      <User size={56} aria-hidden="true" className="mx-auto mb-4 text-blue-300" />
      <h1 className="text-3xl font-bold text-white mb-2">Who's watching?</h1>
      <p className="text-gray-200 mb-8">Pick your profile on this device.</p>
      <div className="space-y-3">
        {['user1', 'user2'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelectUser(key)}
            className="w-full text-white min-h-14 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-lg"
          >
            {userName(settings, key)}
          </button>
        ))}
      </div>
    </div>
  </main>
);

export default UserSelectModal;
