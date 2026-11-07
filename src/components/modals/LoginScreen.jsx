import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import api from '../../services/api';

const LoginScreen = ({ onLoggedIn }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.login(password);
      onLoggedIn();
    } catch (err) {
      setError(err.message.includes('(429)') ? 'Too many attempts. Wait a minute.' : 'Wrong password.');
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-8 max-w-sm w-full border border-gray-700 text-center">
        <Lock size={48} className="mx-auto mb-4 text-blue-400" />
        <h1 className="text-2xl font-bold text-white mb-6">Watch Together</h1>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          autoFocus
        />
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
};

export default LoginScreen;
