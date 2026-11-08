import React, { useState } from 'react';
import { Save, RotateCcw, Download, LogOut } from 'lucide-react';
import Modal from '../common/Modal';
import { DEFAULT_SETTINGS } from '../../users';
import { STREAMING_SERVICES } from '../../streaming';

const NameField = ({ n, value, onChange }) => (
  <div>
    <label htmlFor={`user${n}Name-input`} className="text-sm text-gray-200 mb-1 block">Person {n}</label>
    <input
      id={`user${n}Name-input`}
      type="text"
      maxLength={24}
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-800 text-white border border-gray-500 rounded-lg px-3 min-h-11 focus:border-blue-400 outline-none"
    />
  </div>
);

const SettingsModal = ({ currentSettings, onClose, onSave, onExport, onSignOut }) => {
  const [names, setNames] = useState({ user1Name: currentSettings.user1Name, user2Name: currentSettings.user2Name });
  const [services, setServices] = useState(currentSettings.services || []);
  const toggleService = (s) => setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const valid = names.user1Name.trim() && names.user2Name.trim();

  return (
    <Modal title="Settings" onClose={onClose} maxWidth="max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave({ user1Name: names.user1Name.trim(), user2Name: names.user2Name.trim(), services });
        }}
      >
        <fieldset className="bg-gray-700 p-4 rounded-lg space-y-3">
          <legend className="text-xs text-gray-200 uppercase font-bold px-1">Names</legend>
          <NameField n={1} value={names.user1Name} onChange={(v) => setNames((p) => ({ ...p, user1Name: v }))} />
          <NameField n={2} value={names.user2Name} onChange={(v) => setNames((p) => ({ ...p, user2Name: v }))} />
        </fieldset>
        <fieldset className="bg-gray-700 p-4 rounded-lg mt-4">
          <legend className="text-xs text-gray-200 uppercase font-bold px-1">Our services</legend>
          <div className="flex flex-wrap gap-2">
            {STREAMING_SERVICES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={services.includes(s)}
                onClick={() => toggleService(s)}
                className={`min-h-11 px-3 rounded-full text-sm font-semibold border ${services.includes(s) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-500 text-gray-100'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-200 mt-2">Used for the "On our services" filter and availability in each title's details.</p>
        </fieldset>
        <p className="text-xs text-gray-200 mt-3">Names and services are shared with both devices.</p>
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={() => { setNames({ user1Name: DEFAULT_SETTINGS.user1Name, user2Name: DEFAULT_SETTINGS.user2Name }); setServices([]); }}
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
      <p className="text-xs text-gray-200 mt-2">Export saves both lists as a JSON file.</p>
    </Modal>
  );
};

export default SettingsModal;
