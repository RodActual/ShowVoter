const crypto = require('crypto');

const COOKIE_NAME = 'wt_session';
const ONE_YEAR_S = 60 * 60 * 24 * 365;
const LOGIN_WINDOW_MS = 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

const APP_PASSWORD = process.env.APP_PASSWORD || '';
const authRequired = APP_PASSWORD.length > 0;

// Stateless session: the cookie holds an HMAC keyed by the password,
// so changing APP_PASSWORD signs everyone out.
const sessionValue = authRequired
  ? crypto.createHmac('sha256', APP_PASSWORD).update('watch-together-session-v1').digest('base64url')
  : '';

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key) out[key] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function isAuthenticated(req) {
  if (!authRequired) return true;
  const value = parseCookies(req.headers.cookie)[COOKIE_NAME];
  return Boolean(value) && safeEqual(value, sessionValue);
}

// Blocks cross-site requests that browsers would otherwise send with cookies
// (CSRF on writes, cross-site WebSocket hijacking).
function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser clients and same-origin GETs omit it
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function cookieHeader(req, value, maxAge) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.COOKIE_SECURE === 'true';
  return [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    secure ? 'Secure' : null
  ].filter(Boolean).join('; ');
}

const attempts = new Map(); // ip -> { count, resetAt }

function tooManyAttempts(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LOGIN_MAX_ATTEMPTS;
}

function registerRoutes(app) {
  app.get('/api/session', (req, res) => {
    res.json({ authRequired, authenticated: isAuthenticated(req) });
  });

  app.post('/api/login', (req, res) => {
    if (!authRequired) return res.json({ authenticated: true });
    if (tooManyAttempts(req.ip)) return res.status(429).json({ error: 'Too many attempts, try again in a minute' });
    const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';
    if (!safeEqual(password, APP_PASSWORD)) return res.status(401).json({ error: 'Wrong password' });
    attempts.delete(req.ip);
    res.setHeader('Set-Cookie', cookieHeader(req, sessionValue, ONE_YEAR_S));
    res.json({ authenticated: true });
  });

  app.post('/api/logout', (req, res) => {
    res.setHeader('Set-Cookie', cookieHeader(req, '', 0));
    res.json({ authenticated: false });
  });
}

function requireAuth(req, res, next) {
  if (!isSameOrigin(req)) return res.status(403).json({ error: 'Cross-origin request blocked' });
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

module.exports = { authRequired, isAuthenticated, isSameOrigin, registerRoutes, requireAuth };
