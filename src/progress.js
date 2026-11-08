// Episode progress helpers. Pure (unit-tested); TMDB lookups happen in the caller.

const epKey = (ep) => `${ep.season || 1}-${ep.num}`;
const byEpisode = (a, b) => (a.season || 1) - (b.season || 1) || a.num - b.num;

// Adds (or keeps) one episode, sorted, without duplicates. Existing ratings are preserved.
export function mergeEpisode(episodes = [], ep) {
  if (episodes.some((e) => epKey(e) === epKey(ep))) return [...episodes].sort(byEpisode);
  return [...episodes, ep].sort(byEpisode);
}

export function removeEpisode(episodes = [], ep) {
  return episodes.filter((e) => epKey(e) !== epKey(ep));
}

// The episode after `last`, given the length of its season and whether the next season has episodes.
export function nextAfter(last, seasonLength, nextSeasonHasEpisodes) {
  if (!last) return { season: 1, num: 1 };
  if (seasonLength && last.num < seasonLength) return { season: last.season, num: last.num + 1 };
  if (nextSeasonHasEpisodes) return { season: last.season + 1, num: 1 };
  return null;
}

export const watchedInSeason = (episodes = [], season) => episodes.filter((e) => (e.season || 1) === season).length;

// True when `ep` is the latest aired episode (or later).
export function isCaughtUp(ep, lastAired) {
  if (!ep || !lastAired) return false;
  return ep.season > lastAired.season || (ep.season === lastAired.season && ep.num >= lastAired.num);
}
