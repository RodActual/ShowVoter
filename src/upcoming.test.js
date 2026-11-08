import { test } from 'node:test';
import assert from 'node:assert';
import { buildUpcoming, upcomingCandidates, whenLabel } from './upcoming.js';

const tv = (id, extra = {}) => ({ id: `t${id}`, title: `Show ${id}`, type: 'TV Show', mediaType: 'tv', tmdbId: id, ...extra });
const movie = (id, releaseDate) => ({ id: `m${id}`, title: `Film ${id}`, type: 'Movie', mediaType: 'movie', tmdbId: id, releaseDate });

test('candidates: To Watch shows, in-progress shows once, To Watch movies', () => {
  const { shows, movies } = upcomingCandidates(
    [tv(1), movie(9, '2026-12-01')],
    [tv(1, { id: 'w1', status: 'In progress' }), tv(2, { id: 'w2', status: 'In progress' }), tv(3, { id: 'w3', status: 'Completed' })]
  );
  assert.deepStrictEqual(shows.map((s) => [s.item.id, s.mode]), [['t1', 'toWatch'], ['w2', 'watched']]);
  assert.deepStrictEqual(movies.map((m) => m.item.id), ['m9']);
});

test('build keeps today and later, sorted soonest first', () => {
  const next = { 1: { season: 2, num: 5, title: 'Pilot', airDate: '2026-11-10' }, 2: { season: 1, num: 1, airDate: '2026-11-01' }, 3: null };
  const list = buildUpcoming(
    { shows: [tv(1), tv(2), tv(3)].map((item) => ({ item, mode: 'toWatch' })), movies: [movie(9, '2026-11-08'), movie(8, '2025-01-01')].map((item) => ({ item, mode: 'toWatch' })) },
    (item) => next[item.tmdbId],
    '2026-11-08'
  );
  assert.deepStrictEqual(list.map((u) => [u.item.id, u.date, u.label]), [['m9', '2026-11-08', 'Movie premiere'], ['t1', '2026-11-10', 'S2 E5']]);
});

test('when label', () => {
  assert.strictEqual(whenLabel('2026-11-08', '2026-11-08'), 'Today');
  assert.strictEqual(whenLabel('2026-11-09', '2026-11-08'), 'Tomorrow');
  assert.strictEqual(whenLabel('2026-11-12', '2026-11-08'), 'Thursday');
  assert.strictEqual(whenLabel('2026-11-20', '2026-11-08'), 'Nov 20');
  assert.strictEqual(whenLabel('2027-01-05', '2026-11-08'), 'Jan 5, 2027');
});
