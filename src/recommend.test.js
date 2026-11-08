import { test } from 'node:test';
import assert from 'node:assert';
import { becauseText, rankRecommendations, seedsFrom } from './recommend.js';

const t = (id, title, extra = {}) => ({ tmdbId: id, mediaType: 'tv', title, ...extra });

test('seeds weight loved watched titles and wanted To Watch titles', () => {
  const watched = [
    t(1, 'Loved', { anthonyRating: 10, pamRating: 9 }), // avg 9.5 -> 3.5
    t(2, 'Meh', { anthonyRating: 6, pamRating: 6 }), // below 7, skipped
    t(3, 'Dropped', { anthonyRating: 9, pamRating: 9, status: 'DNF' }), // DNF skipped
    t(4, 'Good', { anthonyRating: 8, pamRating: 0 }) // only one rating: avg 8 -> 2
  ];
  const toWatch = [t(5, 'Wanted', { anthonyPriority: 3, pamPriority: 3 }), t(6, 'Low', { anthonyPriority: 1, pamPriority: 1 })];
  assert.deepStrictEqual(seedsFrom({ toWatch, watched }).map((s) => [s.title.title, s.weight]), [['Loved', 3.5], ['Wanted', 3], ['Good', 2]]);
});

test('titles recommended by several seeds rank higher; listed and both-No are skipped', () => {
  const seedA = { title: t(1, 'A'), weight: 3 };
  const seedB = { title: t(2, 'B'), weight: 2 };
  const ranked = rankRecommendations([
    { seed: seedA, results: [t(10, 'Solo'), t(11, 'Shared'), t(12, 'Listed'), t(13, 'Vetoed')] },
    { seed: seedB, results: [t(11, 'Shared')] }
  ], {
    toWatch: [t(12, 'Listed')],
    votes: [{ id: 'tv-13', user1: 'no', user2: 'no' }]
  });
  assert.deepStrictEqual(ranked.map((r) => r.title), ['Shared', 'Solo']);
  assert.deepStrictEqual(ranked[0].because, ['A', 'B']);
  assert.strictEqual(becauseText(ranked[0].because), 'Because you liked A and B');
  assert.strictEqual(becauseText([]), '');
});

test('one No vote does not hide a recommendation', () => {
  const ranked = rankRecommendations([{ seed: { title: t(1, 'A'), weight: 1 }, results: [t(13, 'X')] }], { votes: [{ id: 'tv-13', user1: 'no' }] });
  assert.strictEqual(ranked.length, 1);
});
