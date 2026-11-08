// Helpers for TMDB titles. Movie and TV ids overlap on TMDB, so always compare both.

export const mediaTypeOf = (item) => item.mediaType || (item.type === 'Movie' ? 'movie' : 'tv');
export const isMovie = (item) => mediaTypeOf(item) === 'movie';
export const sameTitle = (a, b) => a.tmdbId != null && a.tmdbId === b.tmdbId && mediaTypeOf(a) === mediaTypeOf(b);

// "2026-12-01" as a local date (new Date('2026-12-01') is UTC midnight, a day early in the US).
export function parseLocalDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export function daysUntil(value) {
  const date = parseLocalDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date - today) / 86400000);
}

export function localDateString(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Highest (season, episode) in a watched episode list, or null.
export function lastWatchedEpisode(episodes = []) {
  return episodes
    .filter((ep) => ep.season && ep.num)
    .reduce((best, ep) => (!best || ep.season > best.season || (ep.season === best.season && ep.num > best.num) ? ep : best), null);
}
