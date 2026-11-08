// TMDB proxy logic for the Vercel function in api/tmdb. Kept separate so it can be unit-tested.
import { createRemoteJWKSet, jwtVerify } from 'jose';

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

// Verifies a Firebase ID token and that it belongs to the shared app account.
export async function verifyFirebaseToken(token, { projectId, loginEmail, keySet = GOOGLE_JWKS }) {
  const { payload } = await jwtVerify(token, keySet, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId
  });
  if (!loginEmail || String(payload.email).toLowerCase() !== String(loginEmail).toLowerCase()) {
    throw new Error('wrong account');
  }
  if (payload.firebase?.sign_in_provider !== 'password') throw new Error('wrong sign-in method');
  return payload;
}

const SAFE_PATH = /^[a-z0-9_/-]+$/i;

// Returns { status, body }. `verify` and `fetchImpl` are injectable for tests.
export async function handleTmdbRequest({ url, authorization, env, verify = verifyFirebaseToken, fetchImpl = fetch }) {
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  const tmdbPath = pathname.replace(/^\/api\/tmdb\/?/, '');
  if (!tmdbPath || !SAFE_PATH.test(tmdbPath) || tmdbPath.includes('..')) {
    return { status: 400, body: { error: 'Bad TMDB path' } };
  }

  const token = (authorization || '').startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return { status: 401, body: { error: 'Sign in required' } };
  try {
    await verify(token, { projectId: env.VITE_FIREBASE_PROJECT_ID, loginEmail: env.VITE_LOGIN_EMAIL });
  } catch {
    return { status: 401, body: { error: 'Sign in required' } };
  }

  if (!env.TMDB_API_KEY) return { status: 500, body: { error: 'TMDB_API_KEY is not configured' } };

  const target = new URL(`https://api.themoviedb.org/3/${tmdbPath}`);
  for (const [key, value] of searchParams) {
    if (key !== 'api_key') target.searchParams.set(key, value);
  }
  target.searchParams.set('api_key', env.TMDB_API_KEY);

  try {
    const res = await fetchImpl(target);
    const body = await res.json();
    return { status: res.ok ? 200 : res.status, body };
  } catch {
    return { status: 502, body: { error: 'TMDB request failed' } };
  }
}
