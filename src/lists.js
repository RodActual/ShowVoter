// Pure list helpers: filtering, sorting, month grouping, Tonight's pick. No React, no I/O (unit-tested).
import { averageRating } from './users.js';
import { isMovie, lastWatchedEpisode } from './titles.js';

const prioritySum = (i) => (i.anthonyPriority || 0) + (i.pamPriority || 0);
const ratingAvg = (i) => averageRating(i.anthonyRating, i.pamRating);

// filters: { query: string, kind: 'all' | 'movie' | 'tv', services: string[] }
export function filterItems(items, { query = '', kind = 'all', services = [] } = {}) {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (kind === 'movie' && !isMovie(item)) return false;
    if (kind === 'tv' && isMovie(item)) return false;
    if (services.length && !services.includes(item.service || 'Other')) return false;
    if (q && !`${item.title} ${item.service || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export const hasActiveFilters = ({ query = '', kind = 'all', services = [] } = {}) =>
  Boolean(query.trim()) || kind !== 'all' || services.length > 0;

// Distinct services on a list, most common first.
export function servicesOf(items) {
  const counts = new Map();
  items.forEach((i) => counts.set(i.service || 'Other', (counts.get(i.service || 'Other') || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([s]) => s);
}

// sort: To Watch 'priority' | 'title' | 'service' ; Watched 'recent' | 'rating' | 'title'
export function sortItems(items, sort) {
  const byTitle = (a, b) => (a.title || '').localeCompare(b.title || '');
  const list = [...items];
  switch (sort) {
    case 'title': return list.sort(byTitle);
    case 'service': return list.sort((a, b) => (a.service || '').localeCompare(b.service || '') || byTitle(a, b));
    case 'rating': return list.sort((a, b) => ratingAvg(b) - ratingAvg(a) || byTitle(a, b));
    case 'recent': return list.sort((a, b) => (b.watchedDate || '').localeCompare(a.watchedDate || '') || byTitle(a, b));
    case 'priority':
    default: return list.sort((a, b) => prioritySum(b) - prioritySum(a) || byTitle(a, b));
  }
}

// [{ key: '2026-11', label: 'November 2026', items }] newest first; undated items go last under 'Earlier'.
export function groupByMonth(items, locale = 'en-US') {
  const groups = new Map();
  items.forEach((item) => {
    const key = /^\d{4}-\d{2}/.test(item.watchedDate || '') ? item.watchedDate.slice(0, 7) : 'earlier';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return [...groups.entries()]
    .sort(([a], [b]) => (a === 'earlier' ? 1 : b === 'earlier' ? -1 : b.localeCompare(a)))
    .map(([key, list]) => ({
      key,
      label: key === 'earlier'
        ? 'Earlier'
        : new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
      items: list
    }));
}

// Candidates for Tonight's pick: titles you both rated Med or High, best first; else the whole list.
export function pickPool(items) {
  const shared = items.filter((i) => (i.anthonyPriority || 0) >= 2 && (i.pamPriority || 0) >= 2);
  return { pool: sortItems(shared.length ? shared : items, 'priority'), shared: shared.length > 0 };
}

// Next pick after `currentId`, never repeating it when there's another choice. `random` is injectable for tests.
export function nextPick(pool, currentId, random = Math.random) {
  if (pool.length === 0) return null;
  const others = pool.filter((i) => i.id !== currentId);
  const from = others.length ? others : pool;
  return from[Math.floor(random() * from.length)];
}

// Cheap "up next" guess from logged episodes only (no network). The sheet checks TMDB for the exact one.
export function upNextGuess(item, episodes) {
  if (isMovie(item)) return null;
  const last = lastWatchedEpisode(episodes || []);
  return last ? `S${last.season} E${last.num + 1}` : 'S1 E1';
}
