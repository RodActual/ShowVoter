// src/App.jsx
import { useCallback, useEffect, useState } from 'react';
import WatchTogether from './WatchTogether.jsx';
import LoginScreen from './components/modals/LoginScreen.jsx';
import { ToastProvider } from './components/common/Toast.jsx';
import api, { UNAUTHORIZED_EVENT } from './services/api';
import './index.css';

function App() {
  // 'loading' | 'login' | 'ready' | 'error'
  const [state, setState] = useState('loading');

  const checkSession = useCallback(() => {
    setState('loading');
    api.getSession()
      .then(({ authRequired, authenticated }) => setState(authRequired && !authenticated ? 'login' : 'ready'))
      .catch(() => setState('error'));
  }, []);

  useEffect(() => {
    checkSession();
    const onUnauthorized = () => setState('login');
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [checkSession]);

  if (state === 'login') return <LoginScreen onLoggedIn={() => setState('ready')} />;
  if (state === 'error') {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
        <p role="alert">Can't reach the server.</p>
        <button type="button" onClick={checkSession} className="bg-blue-600 px-5 min-h-11 rounded-lg hover:bg-blue-700">Retry</button>
      </main>
    );
  }
  if (state === 'loading') {
    return <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center" role="status">Loading…</main>;
  }

  return (
    <ToastProvider>
      <WatchTogether />
    </ToastProvider>
  );
}

export default App;
