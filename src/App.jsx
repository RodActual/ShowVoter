// src/App.jsx
import { useCallback, useEffect, useState } from 'react';
import WatchTogether from './WatchTogether.jsx';
import LoginScreen from './components/modals/LoginScreen.jsx';
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
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
        <p>Can't reach the server.</p>
        <button onClick={checkSession} className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700">Retry</button>
      </div>
    );
  }
  if (state === 'loading') {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="App">
      <WatchTogether />
    </div>
  );
}

export default App;
