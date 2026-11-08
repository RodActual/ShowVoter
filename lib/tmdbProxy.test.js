import { test } from 'node:test';
import assert from 'node:assert';
import { exportJWK, generateKeyPair, SignJWT, createLocalJWKSet } from 'jose';
import { handleTmdbRequest, verifyFirebaseToken } from './tmdbProxy.js';

const env = { VITE_FIREBASE_PROJECT_ID: 'demo-proj', VITE_LOGIN_EMAIL: 'us@example.com', TMDB_API_KEY: 'k' };
const allow = async () => ({});
const deny = async () => { throw new Error('bad'); };
const okFetch = (seen) => async (url) => { seen.push(String(url)); return { ok: true, status: 200, json: async () => ({ results: [] }) }; };

test('rejects missing or invalid tokens with 401', async () => {
  assert.strictEqual((await handleTmdbRequest({ url: '/api/tmdb/search/multi', env, verify: allow })).status, 401);
  assert.strictEqual((await handleTmdbRequest({ url: '/api/tmdb/search/multi', authorization: 'Bearer x', env, verify: deny })).status, 401);
});

test('rejects unsafe paths with 400', async () => {
  for (const url of ['/api/tmdb/', '/api/tmdb/search/..%2F..', '/api/tmdb/a b']) {
    assert.strictEqual((await handleTmdbRequest({ url, authorization: 'Bearer x', env, verify: allow })).status, 400, url);
  }
});

test('forwards path and params, injects the key, ignores a client api_key', async () => {
  const seen = [];
  const res = await handleTmdbRequest({
    url: '/api/tmdb/search/multi?query=dune&api_key=evil',
    authorization: 'Bearer x',
    env,
    verify: allow,
    fetchImpl: okFetch(seen)
  });
  assert.strictEqual(res.status, 200);
  const sent = new URL(seen[0]);
  assert.strictEqual(sent.pathname, '/3/search/multi');
  assert.strictEqual(sent.searchParams.get('query'), 'dune');
  assert.strictEqual(sent.searchParams.get('api_key'), 'k');
});

test('accepts the rewritten form from vercel.json', async () => {
  const seen = [];
  const res = await handleTmdbRequest({
    url: '/api/tmdb?tmdbPath=tv/1/season/2&language=en-US',
    authorization: 'Bearer x',
    env,
    verify: allow,
    fetchImpl: okFetch(seen)
  });
  assert.strictEqual(res.status, 200);
  const sent = new URL(seen[0]);
  assert.strictEqual(sent.pathname, '/3/tv/1/season/2');
  assert.strictEqual(sent.searchParams.get('language'), 'en-US');
  assert.strictEqual(sent.searchParams.get('tmdbPath'), null);
});

test('returns 500 when the key is not configured', async () => {
  const res = await handleTmdbRequest({ url: '/api/tmdb/movie/1', authorization: 'Bearer x', env: { ...env, TMDB_API_KEY: '' }, verify: allow });
  assert.strictEqual(res.status, 500);
});

test('verifyFirebaseToken checks issuer, audience, account email and provider', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' };
  const keySet = createLocalJWKSet({ keys: [jwk] });
  const sign = (claims, aud = 'demo-proj') => new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(`https://securetoken.google.com/${aud}`)
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
  const opts = { projectId: 'demo-proj', loginEmail: 'us@example.com', keySet };

  await verifyFirebaseToken(await sign({ email: 'us@example.com', firebase: { sign_in_provider: 'password' } }), opts);
  await assert.rejects(verifyFirebaseToken(await sign({ email: 'other@example.com', firebase: { sign_in_provider: 'password' } }), opts));
  await assert.rejects(verifyFirebaseToken(await sign({ firebase: { sign_in_provider: 'anonymous' } }), opts));
  await assert.rejects(verifyFirebaseToken(await sign({ email: 'us@example.com', firebase: { sign_in_provider: 'password' } }, 'other-proj'), opts));
});
