// Match mode logic: who voted what, what to show next, when a title is a match. Pure (unit-tested).
import { sameTitle } from './titles.js';

export const voteKey = (title) => `${title.mediaType}-${title.tmdbId}`;
const otherUser = (key) => (key === 'user1' ? 'user2' : 'user1');

// Next cards for `me`: drop titles already on a list or already voted on by me, de-duplicate,
// and put titles the partner already said Yes to first (those can become matches right away).
export function buildQueue({ candidates, votes, toWatch, watched, me }) {
  const partner = otherUser(me);
  const byKey = new Map(votes.map((v) => [v.id, v]));
  const seen = new Set();
  const queue = [];
  for (const c of candidates) {
    const key = voteKey(c);
    if (seen.has(key)) continue;
    seen.add(key);
    const vote = byKey.get(key);
    if (vote?.[me]) continue;
    if (toWatch.some((t) => sameTitle(t, c)) || watched.some((w) => sameTitle(w, c))) continue;
    queue.push({ ...c, key, partnerYes: vote?.[partner] === 'yes' });
  }
  // Partner's Yes votes on titles not in the candidate feed still deserve a card.
  for (const v of votes) {
    if (seen.has(v.id) || v[me] || v[partner] !== 'yes' || v.matchedAt) continue;
    if (toWatch.some((t) => sameTitle(t, v)) || watched.some((w) => sameTitle(w, v))) continue;
    seen.add(v.id);
    queue.push({ ...v, key: v.id, partnerYes: true });
  }
  return queue.sort((a, b) => Number(b.partnerYes) - Number(a.partnerYes));
}

// Given the stored vote doc (or null) and my new vote, what to write and whether it's a match.
export function applyVote(existing, me, value, now = new Date().toISOString()) {
  const partner = otherUser(me);
  const match = value === 'yes' && existing?.[partner] === 'yes' && !existing?.matchedAt;
  return { update: { [me]: value, updatedAt: now, ...(match ? { matchedAt: now } : {}) }, match };
}
