// src/services/api.js
// Thin client for the self-hosted Express/SQLite server (see /server).

// Sign-in uses an HttpOnly session cookie set by POST /api/login, so no secret
// ever ships in the JS bundle. Any 401 fires 'wt:unauthorized' to show the login screen.
export const UNAUTHORIZED_EVENT = 'wt:unauthorized';

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (res.status === 401 && !path.startsWith('/login')) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API request failed (${res.status}): ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  newId: () => crypto.randomUUID(),

  getSession: () => request('/session'),
  login: (password) => request('/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request('/logout', { method: 'POST' }),

  getCollection: (collection) => request(`/items/${collection}`),
  getDoc: (collection, id) => request(`/items/${collection}/${id}`),
  setDoc: (collection, id, data) =>
    request(`/items/${collection}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDoc: (collection, id) => request(`/items/${collection}/${id}`, { method: 'DELETE' }),

  // Live updates over WebSocket, replacing Firestore's onSnapshot.
  // Returns an unsubscribe function.
  subscribe(collection, { onPut, onDelete }) {
    let socket;
    let closedByCaller = false;
    let retryDelay = 1000;

    const connect = () => {
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(`${protocol}://${location.host}/ws`);

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.collection !== collection) return;
        if (msg.type === 'put') onPut(msg.data);
        if (msg.type === 'delete') onDelete(msg.id);
      };
      socket.onopen = () => { retryDelay = 1000; };
      socket.onclose = () => {
        if (closedByCaller) return;
        setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 15000);
      };
    };
    connect();

    return () => {
      closedByCaller = true;
      socket?.close();
    };
  }
};

export default api;
