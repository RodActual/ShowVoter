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

// The one place that decides "next episode". getSeason(n) resolves to { episodes: [{ num, title, airDate }] }
// or null on failure. Returns { status: 'next', season, num, title, airDate } | { status: 'done' } | { status: 'unknown' }.
export async function resolveNextEpisode(episodes, getSeason) {
  const byLatest = (episodes || []).filter((e) => e.num).map((e) => ({ season: e.season || 1, num: e.num }));
  const last = byLatest.reduce((best, e) => (!best || e.season > best.season || (e.season === best.season && e.num > best.num) ? e : best), null);

  let target;
  if (!last) {
    target = { season: 1, num: 1 };
  } else {
    const season = await getSeason(last.season);
    if (!season?.episodes?.length) return { status: 'unknown' };
    if (last.num < season.episodes.length) {
      target = { season: last.season, num: last.num + 1 };
    } else {
      const nextSeason = await getSeason(last.season + 1);
      if (!nextSeason?.episodes?.length) return { status: 'done' };
      target = { season: last.season + 1, num: 1 };
    }
  }
  const info = (await getSeason(target.season))?.episodes?.find((e) => e.num === target.num);
  return { status: 'next', ...target, title: info?.title || `Episode ${target.num}`, airDate: info?.airDate || null };
}
