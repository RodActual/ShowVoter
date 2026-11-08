// React hook around resolveNextEpisode, using cached TMDB season data.
// Returns null while loading, or the resolver's result ({ status: 'next' | 'done' | 'unknown', ... }).
import { useEffect, useState } from 'react';
import tmdbService from './services/tmdbService';
import { resolveNextEpisode } from './progress';
import { isMovie } from './titles';

export const getSeasonFor = (tmdbId) => (n) => tmdbService.getSeasonDetails(tmdbId, n);

export default function useNextEpisode(item, episodes, enabled = true) {
  const [next, setNext] = useState(null);
  const signature = (episodes || []).map((e) => `${e.season || 1}-${e.num}`).join(',');
  useEffect(() => {
    if (!enabled || !item?.tmdbId || isMovie(item)) { setNext(null); return undefined; }
    let cancelled = false;
    resolveNextEpisode(episodes, getSeasonFor(item.tmdbId)).then((r) => { if (!cancelled) setNext(r); });
    return () => { cancelled = true; };
    // Re-run when the logged episodes change, not on every new array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.tmdbId, item?.mediaType, item?.type, signature, enabled]);
  return next;
}
