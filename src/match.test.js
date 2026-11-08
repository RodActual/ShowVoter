import { test } from 'node:test';
import assert from 'node:assert';
import { applyVote, buildQueue, voteKey } from './match.js';

const t = (id, mediaType = 'movie', extra = {}) => ({ tmdbId: id, mediaType, title: `T${id}`, ...extra });

test('vote key separates movie and TV ids', () => {
  assert.notStrictEqual(voteKey(t(1, 'movie')), voteKey(t(1, 'tv')));
});

test('queue skips listed, watched, my votes and duplicates; partner Yes first', () => {
  const candidates = [t(1), t(2), t(3), t(4), t(2), t(5)];
  const votes = [
    { id: 'movie-3', user1: 'no' },
    { id: 'movie-4', user2: 'yes' },
    { id: 'movie-9', user2: 'yes', tmdbId: 9, mediaType: 'movie', title: 'T9' },
    { id: 'movie-8', user2: 'yes', user1: 'yes', matchedAt: 'x', tmdbId: 8, mediaType: 'movie' }
  ];
  const q = buildQueue({ candidates, votes, toWatch: [t(1)], watched: [t(5)], me: 'user1' });
  assert.deepStrictEqual(q.map((c) => [c.key, c.partnerYes]), [['movie-4', true], ['movie-9', true], ['movie-2', false]]);
});

test('a Yes on a partner Yes is a match, once', () => {
  assert.deepStrictEqual(applyVote(null, 'user1', 'yes', 'now'), { update: { user1: 'yes', updatedAt: 'now' }, match: false });
  assert.strictEqual(applyVote({ user2: 'yes' }, 'user1', 'yes', 'now').match, true);
  assert.strictEqual(applyVote({ user2: 'yes' }, 'user1', 'yes', 'now').update.matchedAt, 'now');
  assert.strictEqual(applyVote({ user2: 'yes', matchedAt: 'old' }, 'user1', 'yes').match, false);
  assert.strictEqual(applyVote({ user2: 'yes' }, 'user1', 'no').match, false);
  assert.strictEqual(applyVote({ user2: 'no' }, 'user1', 'yes').match, false);
});
