import { test } from 'node:test';
import assert from 'node:assert';
import { filterItems, groupByMonth, hasActiveFilters, nextPick, pickPool, servicesOf, sortItems, upNextGuess } from './lists.js';

const items = [
  { id: 'a', title: 'Severance', mediaType: 'tv', service: 'Apple TV+', anthonyPriority: 3, pamPriority: 2, watchedDate: '2026-11-02', anthonyRating: 8, pamRating: 9 },
  { id: 'b', title: 'Dune', mediaType: 'movie', service: 'Max', anthonyPriority: 1, pamPriority: 0, watchedDate: '2026-10-15', anthonyRating: 9, pamRating: 0 },
  { id: 'c', title: 'Dark', mediaType: 'tv', service: 'Netflix', anthonyPriority: 2, pamPriority: 3, watchedDate: '2026-11-20' },
  { id: 'd', title: 'Old Thing', type: 'Movie', service: 'Netflix' }
];

test('filters combine kind, service and text', () => {
  assert.deepStrictEqual(filterItems(items, { kind: 'tv' }).map((i) => i.id), ['a', 'c']);
  assert.deepStrictEqual(filterItems(items, { kind: 'movie' }).map((i) => i.id), ['b', 'd']);
  assert.deepStrictEqual(filterItems(items, { kind: 'tv', services: ['Netflix'], query: 'dar' }).map((i) => i.id), ['c']);
  assert.deepStrictEqual(filterItems(items, { query: 'netflix' }).map((i) => i.id), ['c', 'd']);
  assert.strictEqual(hasActiveFilters({}), false);
  assert.strictEqual(hasActiveFilters({ query: ' x ' }), true);
});

test('services are listed most common first', () => {
  assert.deepStrictEqual(servicesOf(items), ['Netflix', 'Apple TV+', 'Max']);
});

test('sorts', () => {
  assert.deepStrictEqual(sortItems(items, 'priority').map((i) => i.id), ['c', 'a', 'b', 'd']); // ties by title
  assert.deepStrictEqual(sortItems(items, 'recent').map((i) => i.id), ['c', 'a', 'b', 'd']);
  assert.deepStrictEqual(sortItems(items, 'rating').map((i) => i.id), ['b', 'a', 'c', 'd']);
  assert.deepStrictEqual(sortItems(items, 'title').map((i) => i.id), ['c', 'b', 'd', 'a']);
});

test('groups by month newest first with undated last', () => {
  const groups = groupByMonth(sortItems(items, 'recent'));
  assert.deepStrictEqual(groups.map((g) => [g.label, g.items.map((i) => i.id)]), [
    ['November 2026', ['c', 'a']],
    ['October 2026', ['b']],
    ['Earlier', ['d']]
  ]);
});

test('Tonight pool prefers shared Med/High picks and never repeats', () => {
  const { pool, shared } = pickPool(items);
  assert.strictEqual(shared, true);
  assert.deepStrictEqual(pool.map((i) => i.id), ['c', 'a']);
  assert.strictEqual(nextPick(pool, 'a', () => 0).id, 'c');
  assert.strictEqual(nextPick([pool[1]], 'a', () => 0).id, 'a');
  assert.strictEqual(nextPick([], null), null);
  assert.strictEqual(pickPool([items[1], items[3]]).shared, false);
});

test('titles without a TMDB id never match each other', async () => {
  const { sameTitle } = await import('./titles.js');
  assert.strictEqual(sameTitle({ mediaType: 'tv' }, { mediaType: 'tv' }), false);
  assert.strictEqual(sameTitle({ tmdbId: 1, mediaType: 'tv' }, { tmdbId: 1, mediaType: 'tv' }), true);
  assert.strictEqual(sameTitle({ tmdbId: 1, mediaType: 'tv' }, { tmdbId: 1, mediaType: 'movie' }), false);
});

test('up next guess', () => {
  assert.strictEqual(upNextGuess(items[1], []), null);
  assert.strictEqual(upNextGuess(items[0], []), 'S1 E1');
  assert.strictEqual(upNextGuess(items[0], [{ season: 1, num: 3 }, { season: 2, num: 1 }]), 'S2 E2');
});
