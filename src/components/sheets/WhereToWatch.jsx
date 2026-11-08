import React, { useEffect, useState } from 'react';
import tmdbService from '../../services/tmdbService';
import { matchProviders } from '../../streaming';

// Live US availability from TMDB (cached per session). Highlights your services and offers to
// update the saved service when it's out of date.
const WhereToWatch = ({ item, ourServices = [], onUpdateService }) => {
  const [providers, setProviders] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setProviders(null);
    tmdbService.getStreamingProviders(item.tmdbId, item.mediaType || (item.type === 'Movie' ? 'movie' : 'tv'))
      .then((p) => { if (!cancelled) setProviders(p); });
    return () => { cancelled = true; };
  }, [item.tmdbId, item.mediaType, item.type]);

  if (providers === null) return <div role="status" aria-label="Checking where to watch" className="h-11 rounded-lg bg-gray-700 animate-pulse" />;

  const { subscription, mine, best } = matchProviders(providers, ourServices);
  const rentOrBuy = providers.filter((p) => p.kind !== 'flatrate').length > 0;
  const savedIsCurrent = subscription.some((p) => p.name === item.service);
  const suggest = onUpdateService && best && best !== item.service && (!savedIsCurrent || mine.length > 0 && !ourServices.includes(item.service));

  return (
    <div className="space-y-2">
      {subscription.length === 0 ? (
        <p className="text-sm text-gray-200">
          Not on any subscription service in the US right now{rentOrBuy ? ' (rent or buy only).' : '.'}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {subscription.map((p) => {
            const yours = ourServices.includes(p.name);
            return (
              <li
                key={p.id}
                className={`flex items-center gap-2 min-h-11 pl-1 pr-3 rounded-lg text-sm ${yours ? 'bg-green-900/60 border border-green-600 text-white' : 'bg-gray-700 text-gray-100'}`}
              >
                <img src={p.logo} alt="" className="w-8 h-8 rounded" />
                {p.name}
                {yours && <span className="text-xs font-bold text-green-200">Yours</span>}
              </li>
            );
          })}
        </ul>
      )}
      {ourServices.length > 0 && subscription.length > 0 && mine.length === 0 && (
        <p className="text-sm text-yellow-200">Not on any of your services.</p>
      )}
      {suggest && (
        <button
          type="button"
          onClick={() => onUpdateService(item, best)}
          className="min-h-11 px-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold"
        >
          Change saved service to {best}
        </button>
      )}
    </div>
  );
};

export default WhereToWatch;
