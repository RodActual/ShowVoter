// Integration tests: start the real server in a child process and talk to it over HTTP/WS.
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const WebSocket = require('ws');

function freePort() {
  return new Promise((resolve) => {
    const srv = net.createServer().listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function startServer(env = {}) {
  const port = await freePort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-test-'));
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], {
    env: { ...process.env, PORT: String(port), DB_PATH: path.join(dir, 'test.sqlite'), APP_PASSWORD: '', TMDB_API_KEY: '', ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    child.stdout.on('data', (d) => { if (String(d).includes('listening')) resolve(); });
    child.on('exit', (code) => reject(new Error(`server exited ${code}`)));
  });
  const base = `http://localhost:${port}`;
  return {
    base,
    port,
    stop: () => { child.kill(); fs.rmSync(dir, { recursive: true, force: true }); }
  };
}

const json = (body) => ({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('without a password', () => {
  let s;
  before(async () => { s = await startServer(); });
  after(() => s.stop());

  test('PUT merges fields and GET returns them', async () => {
    await fetch(`${s.base}/api/items/toWatch/a`, json({ title: 'A', x: 1 }));
    await fetch(`${s.base}/api/items/toWatch/a`, json({ x: 2 }));
    const doc = await (await fetch(`${s.base}/api/items/toWatch/a`)).json();
    assert.deepStrictEqual(doc, { title: 'A', x: 2, id: 'a' });
  });

  test('an id inside the body cannot override the row id', async () => {
    await fetch(`${s.base}/api/items/toWatch/b`, json({ id: 'evil', title: 'B' }));
    const list = await (await fetch(`${s.base}/api/items/toWatch`)).json();
    assert.ok(list.some((d) => d.id === 'b' && d.title === 'B'));
    assert.ok(!list.some((d) => d.id === 'evil'));
  });

  test('rejects array and non-object bodies', async () => {
    const res = await fetch(`${s.base}/api/items/toWatch/c`, json([1, 2]));
    assert.strictEqual(res.status, 400);
  });

  test('rejects unknown collections and bad TMDB paths', async () => {
    assert.strictEqual((await fetch(`${s.base}/api/items/nope`)).status, 404);
    assert.strictEqual((await fetch(`${s.base}/api/tmdb/search%2F..%2Fx`)).status, 400);
  });

  test('sends security headers', async () => {
    const res = await fetch(`${s.base}/api/session`);
    assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-powered-by'), null);
  });

  test('broadcasts puts and deletes over WebSocket', async () => {
    const ws = new WebSocket(`ws://localhost:${s.port}/ws`);
    await new Promise((r) => ws.on('open', r));
    const messages = [];
    ws.on('message', (m) => messages.push(JSON.parse(m)));
    await fetch(`${s.base}/api/items/watched/w`, json({ title: 'W' }));
    await fetch(`${s.base}/api/items/watched/w`, { method: 'DELETE' });
    await new Promise((r) => setTimeout(r, 200));
    ws.close();
    assert.deepStrictEqual(messages.map((m) => [m.collection, m.type, m.id]), [['watched', 'put', 'w'], ['watched', 'delete', 'w']]);
  });
});

describe('with a password', () => {
  let s;
  before(async () => { s = await startServer({ APP_PASSWORD: 'secret-pw' }); });
  after(() => s.stop());

  const login = (password) => fetch(`${s.base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });

  test('blocks API and WebSocket without a session', async () => {
    assert.strictEqual((await fetch(`${s.base}/api/items/toWatch`)).status, 401);
    const ws = new WebSocket(`ws://localhost:${s.port}/ws`);
    const err = await new Promise((r) => ws.on('error', r));
    assert.match(err.message, /401/);
  });

  test('wrong password is rejected; right one sets an HttpOnly cookie', async () => {
    assert.strictEqual((await login('nope')).status, 401);
    const res = await login('secret-pw');
    assert.strictEqual(res.status, 200);
    const cookie = res.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    const sessionCookie = cookie.split(';')[0];
    const ok = await fetch(`${s.base}/api/items/toWatch`, { headers: { cookie: sessionCookie } });
    assert.strictEqual(ok.status, 200);
    const crossSite = await fetch(`${s.base}/api/items/toWatch/x`, {
      ...json({}),
      headers: { 'Content-Type': 'application/json', cookie: sessionCookie, origin: 'https://evil.example' }
    });
    assert.strictEqual(crossSite.status, 403);
  });
});
