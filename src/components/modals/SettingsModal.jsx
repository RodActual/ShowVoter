import React, { useState } from 'react';
import { Save, RotateCcw, Download, LogOut } from 'lucide-react';
import Modal from '../common/Modal';
import { DEFAULT_SETTINGS } from '../../users';

const HEX = /^#[0-9a-f]{6}$/i;

const UserFields = ({ n, settings, onChange }) => {
  const nameKey = `user${n}Name`;
  const colorKey = `user${n}Color`;
  const colorValid = HEX.test(settings[colorKey]);
  return (
    <fieldset className="bg-gray-700 p-4 rounded-lg space-y-3">
      <legend className="text-xs text-gray-200 uppercase font-bold px-1">User {n}</legend>
      <div>
        <label htmlFor={`${nameKey}-input`} className="text-sm text-gray-200 mb-1 block">Name</label>
        <input
          id={`${nameKey}-input`}
          type="text"
          maxLength={24}
          value={settings[nameKey]}
          onChange={(e) => onChange(nameKey, e.target.value)}
          className="w-full bg-gray-800 text-white border border-gray-500 rounded-lg px-3 min-h-11 focus:border-blue-400 outline-none"
        />
      </div>
      <div>
        <label htmlFor={`${colorKey}-text`} className="text-sm text-gray-200 mb-1 block">Theme color</label>
        <div className="flex gap-2">
          <input
            type="color"
            aria-label={`User ${n} color picker`}
            value={colorValid ? settings[colorKey] : '#000000'}
            onChange={(e) => onChange(colorKey, e.target.value)}
            className="min-h-11 w-14 p-1 bg-gray-800 border border-gray-500 rounded-lg cursor-pointer"
          />
          <input
            id={`${colorKey}-text`}
            type="text"
            value={settings[colorKey]}
            aria-invalid={!colorValid}
            aria-describedby={colorValid ? undefined : `${colorKey}-error`}
            onChange={(e) => onChange(colorKey, e.target.value)}
            className={`flex-1 bg-gray-800 text-white border rounded-lg px-3 min-h-11 font-mono ${colorValid ? 'border-gray-500' : 'border-red-400'}`}
          />
        </div>
        {!colorValid && <p id={`${colorKey}-error`} className="text-red-300 text-xs mt-1">Use a 6-digit hex color like #2563EB.</p>}
      </div>
    </fieldset>
  );
};

const SettingsModal = ({ currentSettings, onClose, onSave, onExport, onSignOut }) => {
  const [settings, setSettings] = useState(currentSettings);
  const handleChange = (field, value) => setSettings((prev) => ({ ...prev, [field]: value }));
  const valid = HEX.test(settings.user1Color) && HEX.test(settings.user2Color)
    && settings.user1Name.trim() && settings.user2Name.trim();

  return (
    <Modal title="Settings" onClose={onClose} maxWidth="max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave({ ...settings, user1Name: settings.user1Name.trim(), user2Name: settings.user2Name.trim() });
        }}
      >
        <div className="space-y-4">
          <UserFields n={1} settings={settings} onChange={handleChange} />
          <UserFields n={2} settings={settings} onChange={handleChange} />
        </div>
        <p className="text-xs text-gray-200 mt-3">Names and colors are shared with both devices.</p>
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={() => setSettings(DEFAULT_SETTINGS)}
            className="px-4 min-h-11 bg-gray-700 text-gray-100 rounded-lg hover:bg-gray-600 flex items-center gap-2"
          >
            <RotateCcw size={18} aria-hidden="true" /> Reset
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="flex-1 bg-green-700 text-white min-h-11 rounded-lg font-bold hover:bg-green-800 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save size={18} aria-hidden="true" /> Save
          </button>
        </div>
      </form>

      <div className="mt-6 pt-4 border-t border-gray-700 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onExport}
          className="min-h-11 rounded-lg bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center gap-2"
        >
          <Download size={18} aria-hidden="true" /> Export data
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="min-h-11 rounded-lg bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center gap-2"
        >
          <LogOut size={18} aria-hidden="true" /> Sign out
        </button>
      </div>
      <p className="text-xs text-gray-200 mt-2">Export saves both lists as a JSON file. Keep a copy somewhere safe now and then.</p>
    </Modal>
  );
};

export default SettingsModal;
