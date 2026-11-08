// src/App.jsx
import { useEffect, useState } from 'react';
import WatchTogether from './WatchTogether.jsx';
import LoginScreen from './components/modals/LoginScreen.jsx';
import { ToastProvider } from './components/common/Toast.jsx';
import api from './services/api';
import './index.css';

function App() {
  // 'loading' | 'login' | 'ready'
  const [state, setState] = useState('loading');

  useEffect(() => api.onSessionChange((signedIn) => setState(signedIn ? 'ready' : 'login')), []);

  if (state === 'loading') {
    return <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center" role="status">Loading…</main>;
  }
  if (state === 'login') return <LoginScreen />;

  return (
    <ToastProvider>
      <WatchTogether />
    </ToastProvider>
  );
}

export default App;
