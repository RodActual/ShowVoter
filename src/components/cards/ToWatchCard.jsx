import React, { useState, useEffect } from 'react';
import { Star, Trash2, Check, ExternalLink, Play } from 'lucide-react';
import { PriorityPicker, PriorityText } from '../common/PriorityRating';
import tmdbService from '../../services/tmdbService';
import { priorityField, resolveUserKey, userColor, userName } from '../../users';
import { daysUntil, isMovie, lastWatchedEpisode } from '../../titles';

const otherUser = (key) => (key === 'user1' ? 'user2' : 'user1');

const ToWatchCard = ({
  item,
  currentUser, // 'user1' | 'user2'
  settings,
  highlighted,
  onDelete,
  onMarkWatched,
  onSetPriority,
  onPlayTrailer,
  watchedEpisodes
}) => {
  const [upNextText, setUpNextText] = useState(null);
  const movie = isMovie(item);
  const partner = otherUser(currentUser);

  // Release countdown, in local days.
  const days = daysUntil(item.releaseDate);
  const releaseCountdown = days > 0
    ? (days === 1 ? (movie ? 'Opens tomorrow' : 'Premieres tomorrow') : `${movie ? 'In theaters' : 'Premieres'} in ${days} days`)
    : null;

  // "Up Next" prediction for TV shows.
  useEffect(() => {
    let cancelled = false;
    const set = (text) => { if (!cancelled) setUpNextText(text); };
    const calculateUpNext = async () => {
      if (movie) return set(null);
      const last = lastWatchedEpisode(watchedEpisodes);
      if (!last) return set('Up next: S1 E1');
      const seasonData = await tmdbService.getSeasonDetails(item.tmdbId, last.season);
      if (!seasonData?.episodes) return set(`Up next: S${last.season} E${last.num + 1}?`);
      if (last.num < seasonData.episodes.length) return set(`Up next: S${last.season} E${last.num + 1}`);
      const nextSeason = await tmdbService.getSeasonDetails(item.tmdbId, last.season + 1);
      set(nextSeason?.episodes?.length ? `Up next: S${last.season + 1} E1` : null);
    };
    calculateUpNext();
    return () => { cancelled = true; };
  }, [item.tmdbId, watchedEpisodes, movie]);

  const searchLink = `https://www.google.com/search?q=${encodeURIComponent(`watch ${item.title} on ${item.service}`)}`;

  // "Who picked this" badge; older items store a name instead of a key. Auto-added items have no picker.
  const addedByKey = resolveUserKey(item.addedBy, settings);

  return (
    <article
      id={`card-${item.id}`}
      className={`bg-gray-800 rounded-lg shadow-lg p-4 mb-3 border overflow-hidden relative transition ${highlighted ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-gray-700'}`}
    >
      {addedByKey && (
        <div
          className="absolute top-0 right-0 px-2 py-1 text-xs font-bold rounded-bl-lg text-white"
          style={{ backgroundColor: userColor(settings, addedByKey) }}
        >
          <span className="sr-only">Added by </span>{userName(settings, addedByKey)}
        </div>
      )}

      <div className="flex gap-3 mb-3">
        {item.posterPath && (
          <img src={item.posterPath} alt="" className="w-20 h-28 object-cover rounded shrink-0" />
        )}
        <div className="flex-1 min-w-0 pr-14">
          <h2 className="font-semibold text-lg text-white leading-tight">{item.title}</h2>
          {releaseCountdown
            ? <p className="text-sm font-bold text-yellow-300 mt-1">{releaseCountdown}</p>
            : upNextText && <p className="text-sm font-semibold text-blue-300 mt-1">{upNextText}</p>}
          <div className="flex gap-2 text-sm mt-2 flex-wrap items-center text-gray-300">
            <span className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded">{item.type}</span>
            {item.year && !releaseCountdown && <span>{item.year}</span>}
            {item.rating && (
              <span className="flex items-center gap-1">
                <Star size={14} aria-hidden="true" className="fill-yellow-400 text-yellow-400" />
                {item.rating} <span className="sr-only">out of 10 on</span> TMDB
              </span>
            )}
          </div>
          {item.isNewEpisodes && (
            <span className="bg-green-700 text-white text-xs px-2 py-1 rounded mt-2 inline-block font-bold">New episodes</span>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        {item.service && (
          <a
            href={searchLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-gray-100 px-3 min-h-11 rounded-lg text-sm"
          >
            {item.service} <ExternalLink size={14} aria-hidden="true" /><span className="sr-only">(search, opens in new tab)</span>
          </a>
        )}
        {item.tmdbId && (
          <button
            type="button"
            onClick={() => onPlayTrailer(item)}
            className="inline-flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-gray-100 px-3 min-h-11 rounded-lg text-sm"
          >
            <Play size={14} aria-hidden="true" /> Trailer
          </button>
        )}
      </div>

      <div className="border-t border-gray-700 pt-3">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm text-gray-200 font-semibold">Your priority</span>
          <span className="text-sm text-gray-300">
            {userName(settings, partner)}: <PriorityText value={item[priorityField(partner)] || 0} />
          </span>
        </div>
        <PriorityPicker
          label={`Your priority for ${item.title}`}
          value={item[priorityField(currentUser)] || 0}
          onChange={(value) => onSetPriority(item, value)}
        />
      </div>

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => onMarkWatched(item)}
          className="flex-1 bg-green-700 text-white min-h-11 rounded-lg hover:bg-green-800 flex items-center justify-center gap-2 font-semibold"
        >
          <Check size={18} aria-hidden="true" /> Watched
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          aria-label={`Delete ${item.title}`}
          className="min-w-11 min-h-11 flex items-center justify-center text-red-300 hover:text-red-200 bg-gray-700 rounded-lg"
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
};

export default ToWatchCard;
