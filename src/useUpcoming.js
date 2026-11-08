import { useEffect, useMemo, useState } from 'react';
import tmdbService from './services/tmdbService';
import { localDateString } from './titles';
import { buildUpcoming, upcomingCandidates } from './upcoming';

// Coming soon list (#51). Looks up each show's next episode on TMDB (cached per session).
export default function useUpcoming(toWatch, watched) {
  const candidates = useMemo(() => upcomingCandidates(toWatch, watched), [toWatch, watched]);
  const showKey = candidates.shows.map((s) => s.item.tmdbId).sort().join(',');
  const [nextById, setNextById] = useState({});

  useEffect(() => {
    let cancelled = false;
    const ids = showKey ? showKey.split(',').map(Number) : [];
    Promise.all(ids.map((id) => tmdbService.getDetails(id, 'tv').then((d) => [id, d?.nextEpisodeToAir || null])))
      .then((pairs) => { if (!cancelled) setNextById(Object.fromEntries(pairs)); });
    return () => { cancelled = true; };
  }, [showKey]);

  return useMemo(
    () => buildUpcoming(candidates, (item) => nextById[item.tmdbId], localDateString()),
    [candidates, nextById]
  );
}
