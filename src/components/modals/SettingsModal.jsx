import React, { useState } from 'react';
import { X, Save, RotateCcw } from 'lucide-react';

const SettingsModal = ({ currentSettings, onClose, onSave }) => {
  // Initialize state with current settings
  const [settings, setSettings] = useState(currentSettings);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setSettings({
      user1Name: 'Anthony',
      user1Color: '#2563EB', // Blue-600
      user2Name: 'Pam',
      user2Color: '#DB2777'  // Pink-600
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700 relative shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">App Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* User 1 Settings */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <label className="block text-xs text-gray-400 uppercase font-bold mb-2">User 1 Profile</label>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-300 mb-1 block">Name</span>
                <input 
                  type="text" 
                  value={settings.user1Name}
                  onChange={(e) => handleChange('user1Name', e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <span className="text-sm text-gray-300 mb-1 block">Theme Color</span>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={settings.user1Color}
                    onChange={(e) => handleChange('user1Color', e.target.value)}
                    className="h-10 w-14 p-1 bg-gray-800 border border-gray-600 rounded cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={settings.user1Color}
                    onChange={(e) => handleChange('user1Color', e.target.value)}
                    className="flex-1 bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* User 2 Settings */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <label className="block text-xs text-gray-400 uppercase font-bold mb-2">User 2 Profile</label>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-300 mb-1 block">Name</span>
                <input 
                  type="text" 
                  value={settings.user2Name}
                  onChange={(e) => handleChange('user2Name', e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 focus:border-pink-500 outline-none"
                />
              </div>
              <div>
                <span className="text-sm text-gray-300 mb-1 block">Theme Color</span>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={settings.user2Color}
                    onChange={(e) => handleChange('user2Color', e.target.value)}
                    className="h-10 w-14 p-1 bg-gray-800 border border-gray-600 rounded cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={settings.user2Color}
                    onChange={(e) => handleChange('user2Color', e.target.value)}
                    className="flex-1 bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button 
            onClick={handleReset}
            className="px-4 py-3 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 flex items-center gap-2"
            title="Reset to Defaults"
          >
            <RotateCcw size={18} />
          </button>
          <button 
            onClick={() => onSave(settings)}
            className="flex-1 bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Save size={18} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;