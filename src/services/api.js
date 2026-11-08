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

// --- One shared WebSocket for all live updates -----------------------------
// Each subscriber gets onPut/onDelete for its collection and onSync after every
// (re)connect, so changes missed while offline are fetched again.
const subscribers = new Set();
let socket = null;
let retryDelay = 1000;
let retryTimer = null;

function connect() {
  clearTimeout(retryTimer);
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  socket = new WebSocket(`${protocol}://${location.host}/ws`);

  socket.onopen = () => {
    retryDelay = 1000;
    subscribers.forEach((s) => s.onSync?.());
  };
  socket.onmessage = (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    subscribers.forEach((s) => {
      if (msg.collection !== s.collection) return;
      if (msg.type === 'put') s.onPut?.(msg.data);
      if (msg.type === 'delete') s.onDelete?.(msg.id);
    });
  };
  socket.onclose = () => {
    socket = null;
    if (subscribers.size === 0) return;
    retryTimer = setTimeout(connect, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 15000);
  };
}

// Phones suspend sockets in the background; reconnect as soon as the app is visible again.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && subscribers.size > 0 && !socket) connect();
  });
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

  // Live updates. onSync runs on every (re)connect: refetch there. Returns an unsubscribe function.
  subscribe(collection, { onPut, onDelete, onSync }) {
    const sub = { collection, onPut, onDelete, onSync };
    subscribers.add(sub);
    if (!socket) connect();
    else if (socket.readyState === WebSocket.OPEN) onSync?.();
    return () => {
      subscribers.delete(sub);
      if (subscribers.size === 0) {
        clearTimeout(retryTimer);
        socket?.close();
        socket = null;
      }
    };
  }
};

export default api;
