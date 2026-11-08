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
    <main className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-8 max-w-sm w-full border border-gray-700 text-center">
        <Lock size={48} aria-hidden="true" className="mx-auto mb-4 text-blue-300" />
        <h1 className="text-2xl font-bold text-white mb-6">Watch Together</h1>
        <label htmlFor="password" className="sr-only">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 min-h-12 bg-gray-700 border border-gray-500 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:border-blue-500"
          autoFocus
        />
        {error && <p role="alert" className="text-red-300 text-sm mt-3">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="w-full mt-4 bg-blue-600 text-white min-h-12 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
};

export default LoginScreen;
