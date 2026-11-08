import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import tmdbService from '../../services/tmdbService';
import { RatingSelect } from '../common/RatingPicker';
import { lastWatchedEpisode, localDateString, parseLocalDate } from '../../titles';

const formatDate = (value) => parseLocalDate(value)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const EpisodeRow = ({ ep, logged, today, ratingProps }) => {
  const [open, setOpen] = useState(false);
  const aired = ep.airDate && ep.airDate <= today;
  const long = (ep.overview || '').length > 140;
  return (
    <li className={`rounded-lg p-3 ${logged ? 'bg-gray-700' : 'bg-gray-900 border border-gray-700'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-semibold leading-snug">
            <span className="text-gray-200 font-normal mr-1">E{ep.num}</span>{ep.title}
          </p>
          <p className="text-xs text-gray-200 mt-0.5 flex items-center gap-2 flex-wrap">
            {ep.airDate ? (aired ? formatDate(ep.airDate) : `Airs ${formatDate(ep.airDate)}`) : 'Air date not announced'}
            {logged && (
              <span className="inline-flex items-center gap-1 text-green-300 font-semibold">
                <CheckCircle2 size={14} aria-hidden="true" /> Watched
              </span>
            )}
          </p>
        </div>
        {logged && ratingProps && <RatingSelect {...ratingProps} />}
      </div>
      {ep.overview ? (
        <>
          <p className={`text-sm text-gray-100 mt-2 ${open ? '' : 'line-clamp-3'}`}>{ep.overview}</p>
          {long && (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="text-sm text-blue-300 font-semibold min-h-11 -mb-2"
            >
              {open ? 'Show less' : 'Show more'}
            </button>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-300 mt-2 italic">No overview yet.</p>
      )}
    </li>
  );
};

// Read-only browser of a show's seasons and episodes, with overviews. Logged episodes are marked;
// on Watched shows your episode rating can be changed inline. Never marks anything watched.
const EpisodeBrowser = ({ item, loggedEpisodes = [], myRatingField, partnerRatingField, partnerName, onRateEpisode }) => {
  const [seasonCount, setSeasonCount] = useState(null);
  const [season, setSeason] = useState(() => lastWatchedEpisode(loggedEpisodes)?.season || 1);
  const [episodes, setEpisodes] = useState(null); // null = loading
  const [error, setError] = useState(false);
  const today = localDateString();

  useEffect(() => {
    let cancelled = false;
    tmdbService.getDetails(item.tmdbId, 'tv').then((d) => {
      if (!cancelled) setSeasonCount(d?.numberOfSeasons || 1);
    });
    return () => { cancelled = true; };
  }, [item.tmdbId]);

  useEffect(() => {
    let cancelled = false;
    setEpisodes(null);
    setError(false);
    tmdbService.getSeasonDetails(item.tmdbId, season).then((data) => {
      if (cancelled) return;
      if (data?.episodes) setEpisodes(data.episodes);
      else setError(true);
    });
    return () => { cancelled = true; };
  }, [item.tmdbId, season]);

  const loggedFor = (num) => loggedEpisodes.find((e) => (e.season || 1) === season && e.num === num);
  const loggedCount = loggedEpisodes.filter((e) => (e.season || 1) === season).length;

  return (
    <div>
      {seasonCount > 1 && (
        <div role="group" aria-label="Season" className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
          {Array.from({ length: seasonCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={season === n}
              onClick={() => setSeason(n)}
              className={`shrink-0 min-h-11 min-w-11 px-3 rounded-full text-sm font-semibold border ${season === n ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-100'}`}
            >
              S{n}
            </button>
          ))}
        </div>
      )}

      {episodes === null && !error && (
        <ul role="status" aria-label="Loading episodes" className="space-y-2">
          {[0, 1, 2].map((i) => <li key={i} className="h-20 rounded-lg bg-gray-700 animate-pulse" />)}
        </ul>
      )}
      {error && <p className="text-sm text-red-200">Couldn't load season {season}.</p>}
      {episodes && (
        <>
          <p className="text-xs text-gray-200 mb-2">
            Season {season} · {episodes.length} episodes{loggedCount ? ` · ${loggedCount} watched` : ''}
          </p>
          <ul className="space-y-2">
            {episodes.map((ep) => {
              const logged = loggedFor(ep.num);
              return (
                <EpisodeRow
                  key={ep.num}
                  ep={ep}
                  logged={logged}
                  today={today}
                  ratingProps={logged && onRateEpisode ? {
                    label: `Your rating for season ${season} episode ${ep.num}${logged[partnerRatingField] ? ` (${partnerName}: ${logged[partnerRatingField]}/10)` : ''}`,
                    value: logged[myRatingField] || 0,
                    onChange: (v) => onRateEpisode(logged, v)
                  } : null}
                />
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};

export default EpisodeBrowser;
