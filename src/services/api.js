// src/services/api.js
// Thin client for the self-hosted Express/SQLite server (see /server).

const APP_TOKEN = import.meta.env.VITE_APP_TOKEN || '';

function authHeader() {
  return APP_TOKEN ? { Authorization: `Bearer ${APP_TOKEN}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(options.headers || {}) }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API request failed (${res.status}): ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  newId: () => crypto.randomUUID(),

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
      const tokenParam = APP_TOKEN ? `?token=${encodeURIComponent(APP_TOKEN)}` : '';
      socket = new WebSocket(`${protocol}://${location.host}/ws${tokenParam}`);

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
