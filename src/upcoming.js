// Coming soon (#51): upcoming episodes and premieres for titles already on your lists. Pure; unit-tested.
import { isMovie, parseLocalDate, sameTitle } from './titles.js';

// Shows to check: TV on To Watch plus in-progress shows on Watched (one entry per show; To Watch wins).
export function upcomingCandidates(toWatch = [], watched = []) {
  const shows = toWatch.filter((t) => !isMovie(t) && t.tmdbId).map((item) => ({ item, mode: 'toWatch' }));
  for (const w of watched) {
    if (w.status === 'In progress' && w.tmdbId && !isMovie(w) && !shows.some((s) => sameTitle(s.item, w))) {
      shows.push({ item: w, mode: 'watched' });
    }
  }
  const movies = toWatch.filter((t) => isMovie(t)).map((item) => ({ item, mode: 'toWatch' }));
  return { shows, movies };
}

// Builds the sorted list. nextFor(item) gives { season, num, title, airDate } or null for a show.
export function buildUpcoming({ shows, movies }, nextFor, today) {
  const out = [];
  for (const { item, mode } of shows) {
    const next = nextFor(item);
    if (next?.airDate && next.airDate >= today) out.push({ item, mode, date: next.airDate, label: `S${next.season} E${next.num}`, title: next.title || '' });
  }
  for (const { item, mode } of movies) {
    if (item.releaseDate && item.releaseDate >= today) out.push({ item, mode, date: item.releaseDate.slice(0, 10), label: 'Movie premiere', title: '' });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.item.title.localeCompare(b.item.title));
}

// "Today", "Tomorrow", a weekday within 6 days, else "Nov 14" (or "Nov 14, 2027" in another year).
export function whenLabel(date, today) {
  const d = parseLocalDate(date);
  const t = parseLocalDate(today);
  if (!d || !t) return '';
  const days = Math.round((d - t) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1 && days < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(d.getFullYear() !== t.getFullYear() ? { year: 'numeric' } : {}) });
}
