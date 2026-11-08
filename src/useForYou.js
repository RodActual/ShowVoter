// Fetches TMDB recommendations for your strongest titles and ranks them (see recommend.js).
import { useEffect, useMemo, useState } from 'react';
import tmdbService from './services/tmdbService';
import { rankRecommendations, seedsFrom } from './recommend';
import { voteKey } from './match';

export default function useForYou({ toWatch, watched, votes, enabled = true }) {
  const seeds = useMemo(() => seedsFrom({ toWatch, watched }), [toWatch, watched]);
  // Refetch only when the set of seeds changes, not on every list update.
  const signature = seeds.map((s) => `${voteKey(s.title)}:${s.weight}`).join('|');
  const [seedResults, setSeedResults] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error | empty

  useEffect(() => {
    if (!enabled) return undefined;
    if (seeds.length === 0) { setSeedResults([]); setStatus('empty'); return undefined; }
    let cancelled = false;
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    Promise.all(seeds.map((seed) => tmdbService.recommendations(seed.title.tmdbId, seed.title.mediaType)
      .then((results) => ({ seed, results }))
      .catch(() => null)))
      .then((all) => {
        if (cancelled) return;
        const ok = all.filter(Boolean);
        setSeedResults(ok);
        setStatus(ok.length ? 'ready' : 'error');
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, enabled]);

  const items = useMemo(() => rankRecommendations(seedResults, { toWatch, watched, votes }), [seedResults, toWatch, watched, votes]);
  return { items, status };
}
