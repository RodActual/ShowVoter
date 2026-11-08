// "For you" ranking from both lists. Pure (unit-tested); fetching lives in useForYou.
import { averageRating } from './users.js';
import { sameTitle } from './titles.js';
import { voteKey } from './match.js';

// Seeds: watched titles you both liked (weighted by average rating) and To Watch titles you
// both want (weighted by combined priority). Returns the strongest `limit`, highest first.
export function seedsFrom({ toWatch = [], watched = [] }, limit = 8) {
  const seeds = [];
  watched.forEach((w) => {
    if (!w.tmdbId || w.status === 'DNF') return;
    const avg = averageRating(w.anthonyRating, w.pamRating);
    if (avg >= 7) seeds.push({ title: w, weight: avg - 6 });
  });
  toWatch.forEach((t) => {
    if (!t.tmdbId) return;
    const sum = (t.anthonyPriority || 0) + (t.pamPriority || 0);
    if (sum >= 3) seeds.push({ title: t, weight: sum / 2 });
  });
  return seeds.sort((a, b) => b.weight - a.weight || (a.title.title || '').localeCompare(b.title.title || '')).slice(0, limit);
}

// seedResults: [{ seed: { title, weight }, results: [title, ...] }] (results in TMDB order).
// A title recommended by several seeds outranks one recommended by a single seed; earlier
// positions count a bit more. Skips anything on a list and anything you both voted No on.
export function rankRecommendations(seedResults, { toWatch = [], watched = [], votes = [] } = {}) {
  const bothNo = new Set(votes.filter((v) => v.user1 === 'no' && v.user2 === 'no').map((v) => v.id));
  const listed = (t) => toWatch.some((x) => sameTitle(x, t)) || watched.some((x) => sameTitle(x, t));
  const byKey = new Map();
  seedResults.forEach(({ seed, results }) => {
    results.forEach((r, idx) => {
      const key = voteKey(r);
      if (bothNo.has(key) || listed(r)) return;
      const contribution = seed.weight * (1 - Math.min(idx, 19) / 40);
      const entry = byKey.get(key) || { ...r, key, score: 0, because: [] };
      entry.score += contribution;
      entry.because.push({ title: seed.title.title, contribution });
      byKey.set(key, entry);
    });
  });
  return [...byKey.values()]
    .map((e) => ({
      ...e,
      score: Math.round(e.score * 100) / 100,
      because: e.because.sort((a, b) => b.contribution - a.contribution).map((b) => b.title).filter((t, i, arr) => arr.indexOf(t) === i).slice(0, 2)
    }))
    .sort((a, b) => b.score - a.score || (a.title || '').localeCompare(b.title || ''));
}

export const becauseText = (because) => (because?.length ? `Because you liked ${because.join(' and ')}` : '');
