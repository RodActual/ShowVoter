import { test } from 'node:test';
import assert from 'node:assert';
import { isCaughtUp, mergeEpisode, nextAfter, removeEpisode, resolveNextEpisode, watchedInSeason } from './progress.js';

test('merge keeps order, ratings and no duplicates', () => {
  const eps = [{ season: 1, num: 2, anthonyRating: 8 }];
  const merged = mergeEpisode(eps, { season: 1, num: 1 });
  assert.deepStrictEqual(merged.map((e) => e.num), [1, 2]);
  assert.strictEqual(mergeEpisode(merged, { season: 1, num: 2, anthonyRating: 0 }).find((e) => e.num === 2).anthonyRating, 8);
  assert.deepStrictEqual(removeEpisode(merged, { season: 1, num: 1 }).map((e) => e.num), [2]);
});

test('next episode crosses seasons and stops at the end', () => {
  assert.deepStrictEqual(nextAfter(null, 0, false), { season: 1, num: 1 });
  assert.deepStrictEqual(nextAfter({ season: 2, num: 3 }, 10, true), { season: 2, num: 4 });
  assert.deepStrictEqual(nextAfter({ season: 2, num: 10 }, 10, true), { season: 3, num: 1 });
  assert.strictEqual(nextAfter({ season: 2, num: 10 }, 10, false), null);
});

test('season counts and caught-up check', () => {
  assert.strictEqual(watchedInSeason([{ season: 1, num: 1 }, { season: 2, num: 1 }, { num: 2 }], 1), 2);
  assert.strictEqual(isCaughtUp({ season: 2, num: 5 }, { season: 2, num: 5 }), true);
  assert.strictEqual(isCaughtUp({ season: 2, num: 4 }, { season: 2, num: 5 }), false);
  assert.strictEqual(isCaughtUp({ season: 3, num: 1 }, { season: 2, num: 5 }), true);
  assert.strictEqual(isCaughtUp({ season: 1, num: 1 }, null), false);
});

const fakeSeasons = (lengths) => async (n) => (lengths[n] ? { episodes: Array.from({ length: lengths[n] }, (_, i) => ({ num: i + 1, title: `S${n}E${i + 1}`, airDate: '2024-01-01' })) } : null);

test('next episode rolls over when the season is finished (S4 E9 of 9 -> S5 E1)', async () => {
  const next = await resolveNextEpisode([{ season: 4, num: 9 }], fakeSeasons({ 4: 9, 5: 8 }));
  assert.deepStrictEqual([next.status, next.season, next.num, next.title], ['next', 5, 1, 'S5E1']);
});

test('next episode stays in the season, starts at S1 E1, reports done and unknown', async () => {
  assert.deepStrictEqual((await resolveNextEpisode([{ season: 4, num: 3 }], fakeSeasons({ 4: 9 }))).num, 4);
  assert.deepStrictEqual(await resolveNextEpisode([], fakeSeasons({ 1: 5 })).then((r) => [r.season, r.num]), [1, 1]);
  assert.deepStrictEqual(await resolveNextEpisode([{ season: 4, num: 9 }], fakeSeasons({ 4: 9 })), { status: 'done' });
  assert.deepStrictEqual(await resolveNextEpisode([{ season: 4, num: 9 }], fakeSeasons({})), { status: 'unknown' });
  // Manual entries without a season count as season 1.
  assert.strictEqual((await resolveNextEpisode([{ num: 2 }], fakeSeasons({ 1: 3 }))).num, 3);
});
