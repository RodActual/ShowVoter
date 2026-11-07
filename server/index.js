require('dotenv').config();

const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');

const db = require('./db');
const auth = require('./auth');

const PORT = process.env.PORT || 4000;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const ALLOWED_COLLECTIONS = new Set(['toWatch', 'watched', 'settings']);

const selectAllStmt = db.prepare('SELECT id, data FROM items WHERE collection = ?');
const selectOneStmt = db.prepare('SELECT id, data, createdAt FROM items WHERE collection = ? AND id = ?');
const upsertStmt = db.prepare(`
  INSERT INTO items (collection, id, data, createdAt, updatedAt)
  VALUES (@collection, @id, @data, @createdAt, @updatedAt)
  ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt
`);
const deleteStmt = db.prepare('DELETE FROM items WHERE collection = ? AND id = ?');

function rowToDoc(row) {
  return { id: row.id, ...JSON.parse(row.data) };
}

const app = express();
app.use(express.json());

// /api/session and /api/login must be reachable before signing in.
auth.registerRoutes(app);
app.use('/api', auth.requireAuth);

function validCollection(req, res, next) {
  if (!ALLOWED_COLLECTIONS.has(req.params.collection)) {
    return res.status(404).json({ error: 'Unknown collection' });
  }
  next();
}

app.get('/api/items/:collection', validCollection, (req, res) => {
  res.json(selectAllStmt.all(req.params.collection).map(rowToDoc));
});

app.get('/api/items/:collection/:id', validCollection, (req, res) => {
  const row = selectOneStmt.get(req.params.collection, req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(rowToDoc(row));
});

// Upsert with merge semantics, mirroring Firestore's setDoc(..., { merge: true }).
app.put('/api/items/:collection/:id', validCollection, (req, res) => {
  const { collection, id } = req.params;
  const existingRow = selectOneStmt.get(collection, id);
  const now = new Date().toISOString();
  const existingData = existingRow ? JSON.parse(existingRow.data) : null;
  const merged = { ...existingData, ...req.body };

  upsertStmt.run({
    collection,
    id,
    data: JSON.stringify(merged),
    createdAt: existingRow ? existingRow.createdAt : now,
    updatedAt: now
  });

  const doc = { id, ...merged };
  broadcast({ collection, type: 'put', id, data: doc });
  res.json(doc);
});

app.delete('/api/items/:collection/:id', validCollection, (req, res) => {
  const { collection, id } = req.params;
  deleteStmt.run(collection, id);
  broadcast({ collection, type: 'delete', id });
  res.status(204).end();
});

// TMDB proxy: keeps the TMDB API key server-side only.
app.get('/api/tmdb/*', async (req, res) => {
  if (!TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB_API_KEY is not configured on the server' });
  }
  const tmdbPath = req.params[0];
  try {
    const url = new URL(`https://api.themoviedb.org/3/${tmdbPath}`);
    for (const [key, value] of Object.entries(req.query)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set('api_key', TMDB_API_KEY);

    const tmdbRes = await fetch(url);
    const data = await tmdbRes.json();
    if (!tmdbRes.ok) return res.status(tmdbRes.status).json(data);
    res.json(data);
  } catch (err) {
    console.error('TMDB proxy error:', err);
    res.status(500).json({ error: 'TMDB request failed' });
  }
});

// Serve the built frontend (npm run build in the project root outputs to ../build)
// so a single Node process can host the whole app in production.
const distPath = path.join(__dirname, '..', 'build');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = http.createServer(app);
const wss = new WebSocketServer({
  server,
  path: '/ws',
  verifyClient: ({ req }) => auth.isSameOrigin(req) && auth.isAuthenticated(req)
});

function broadcast(message) {
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) client.send(payload);
  });
}

server.listen(PORT, () => {
  console.log(`Watch Together server listening on port ${PORT}`);
  if (!auth.authRequired) {
    console.warn('APP_PASSWORD is not set: anyone who can reach this server can read and change your lists.');
  }
});
