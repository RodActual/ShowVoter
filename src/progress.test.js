import { test } from 'node:test';
import assert from 'node:assert';
import { isCaughtUp, mergeEpisode, nextAfter, removeEpisode, watchedInSeason } from './progress.js';

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
