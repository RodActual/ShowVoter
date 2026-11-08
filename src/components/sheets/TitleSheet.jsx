import React, { useEffect, useState } from 'react';
import { Ban, Check, ExternalLink, Play, Star, Trash2 } from 'lucide-react';
import Modal from '../common/Modal';
import { PriorityPicker, PriorityText } from '../common/PriorityRating';
import RatingPicker, { RatingSelect } from '../common/RatingPicker';
import tmdbService from '../../services/tmdbService';
import EpisodeBrowser from './EpisodeBrowser';
import MoreLikeThis from './MoreLikeThis';
import { averageRating, priorityField, ratingField, resolveUserKey, userName } from '../../users';
import { daysUntil, isMovie, lastWatchedEpisode } from '../../titles';

const otherUser = (key) => (key === 'user1' ? 'user2' : 'user1');

// Exact "up next" for TV, checked against TMDB season lengths (only while the sheet is open).
function useUpNext(item, episodes, enabled) {
  const [text, setText] = useState(null);
  useEffect(() => {
    if (!enabled || isMovie(item) || !item.tmdbId) return undefined;
    let cancelled = false;
    const set = (t) => { if (!cancelled) setText(t); };
    (async () => {
      const last = lastWatchedEpisode(episodes || []);
      if (!last) return set('Up next: S1 E1');
      const season = await tmdbService.getSeasonDetails(item.tmdbId, last.season);
      if (!season?.episodes) return set(`Up next: S${last.season} E${last.num + 1}?`);
      if (last.num < season.episodes.length) return set(`Up next: S${last.season} E${last.num + 1}`);
      const next = await tmdbService.getSeasonDetails(item.tmdbId, last.season + 1);
      set(next?.episodes?.length ? `Up next: S${last.season + 1} E1` : 'All aired episodes watched');
    })();
    return () => { cancelled = true; };
  }, [item, episodes, enabled]);
  return text;
}

const Section = ({ title, children }) => (
  <section className="border-t border-gray-700 pt-4 mt-4">
    <h3 className="text-sm font-bold text-gray-100 mb-2">{title}</h3>
    {children}
  </section>
);

const TitleSheet = ({
  item,
  mode, // 'toWatch' | 'watched'
  currentUser,
  settings,
  watchedEpisodes,
  onClose,
  onSetPriority,
  onMarkWatched,
  onSetRating,
  onSetEpisodeRating,
  onDelete,
  onPlayTrailer,
  isListed,
  onPreview
}) => {
  const partner = otherUser(currentUser);
  const isDNF = item.status === 'DNF';
  const episodes = mode === 'watched' ? item.episodes || [] : watchedEpisodes;
  const upNext = useUpNext(item, episodes, mode === 'toWatch');
  const days = daysUntil(item.releaseDate);
  const addedByKey = resolveUserKey(item.addedBy, settings);
  const searchLink = `https://www.google.com/search?q=${encodeURIComponent(`watch ${item.title} on ${item.service}`)}`;
  const myRating = item[ratingField(currentUser)] || 0;
  const partnerRating = item[ratingField(partner)] || 0;
  const avg = averageRating(item.anthonyRating, item.pamRating);

  const episodesBySeason = (item.episodes || []).reduce((acc, ep) => {
    (acc[ep.season || 1] ||= []).push(ep);
    return acc;
  }, {});

  const secondary = 'min-h-11 px-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold inline-flex items-center gap-2';

  return (
    <Modal title={item.title} onClose={onClose}>
      <div className="flex gap-4">
        {item.posterPath && (
          <img src={item.posterPath} alt="" className={`w-24 h-36 object-cover rounded-lg shrink-0 bg-gray-700 ${isDNF ? 'grayscale' : ''}`} />
        )}
        <div className="min-w-0 space-y-1 text-sm text-gray-100">
          <p>{[isMovie(item) ? 'Movie' : 'TV show', item.year].filter(Boolean).join(' · ')}</p>
          {item.rating && (
            <p className="flex items-center gap-1">
              <Star size={14} aria-hidden="true" className="fill-yellow-400 text-yellow-400" /> {item.rating}/10 on TMDB
            </p>
          )}
          {mode === 'toWatch' && days > 0 && (
            <p className="font-bold text-yellow-300">{isMovie(item) ? 'In theaters' : 'Premieres'} {days === 1 ? 'tomorrow' : `in ${days} days`}</p>
          )}
          {mode === 'toWatch' && upNext && <p className="font-semibold text-blue-200">{upNext}</p>}
          {mode === 'watched' && (isDNF
            ? <p className="inline-flex items-center gap-1 font-bold text-red-200"><Ban size={14} aria-hidden="true" /> Abandoned</p>
            : item.watchedDate && <p>Watched {item.watchedDate}</p>)}
          {addedByKey && <p>Added by {userName(settings, addedByKey)}</p>}
        </div>
      </div>

      {item.overview && <p className="text-sm text-gray-200 mt-3 line-clamp-5">{item.overview}</p>}

      <div className="flex flex-wrap gap-2 mt-3">
        {item.tmdbId && (
          <button type="button" onClick={() => onPlayTrailer(item)} className={secondary}>
            <Play size={16} aria-hidden="true" /> Trailer
          </button>
        )}
        {item.service && (
          <a href={searchLink} target="_blank" rel="noreferrer" className={secondary}>
            {item.service} <ExternalLink size={14} aria-hidden="true" /><span className="sr-only">(search, opens in new tab)</span>
          </a>
        )}
      </div>

      {mode === 'toWatch' && (
        <>
          <Section title="Your priority">
            <PriorityPicker
              label={`Your priority for ${item.title}`}
              value={item[priorityField(currentUser)] || 0}
              onChange={(v) => onSetPriority(item, v)}
            />
            <p className="text-sm text-gray-200 mt-2">
              {userName(settings, partner)}: <PriorityText value={item[priorityField(partner)] || 0} />
            </p>
          </Section>
          <button
            type="button"
            onClick={() => onMarkWatched(item)}
            className="w-full mt-5 min-h-12 rounded-lg bg-green-700 hover:bg-green-800 text-white font-semibold flex items-center justify-center gap-2"
          >
            <Check size={18} aria-hidden="true" /> Mark as watched
          </button>
        </>
      )}

      {mode === 'watched' && !isDNF && (
        <>
          <Section title={`Ratings${avg ? ` · ${avg.toFixed(1)} average` : ''}`}>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-100">Your rating: <strong className="text-white">{myRating ? `${myRating}/10` : 'not rated'}</strong></span>
              <span className="text-gray-200 flex items-center gap-1">
                {userName(settings, partner)}: {partnerRating ? `${partnerRating}/10` : 'not rated'}
              </span>
            </div>
            <RatingPicker label={`Your rating for ${item.title}`} value={myRating} onChange={(v) => onSetRating(item, v)} />
          </Section>

          {!item.tmdbId && (item.episodes || []).length > 0 && (
            <Section title={`Episodes (${item.episodes.length})`}>
              <div className="space-y-4">
                {Object.keys(episodesBySeason).map((s) => (
                  <div key={s}>
                    <h4 className="text-xs uppercase font-bold text-gray-200 mb-2">Season {s}</h4>
                    <ul className="space-y-2">
                      {episodesBySeason[s].map((ep) => (
                        <li key={`${ep.season}-${ep.num}`} className="bg-gray-700 p-2 pl-3 rounded-lg flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-white text-sm truncate">E{ep.num}: {ep.title}</p>
                            <p className="text-xs text-gray-200">
                              {userName(settings, partner)}: {ep[ratingField(partner)] ? `${ep[ratingField(partner)]}/10` : 'not rated'}
                            </p>
                          </div>
                          <RatingSelect
                            label={`Your rating for season ${ep.season || 1} episode ${ep.num}`}
                            value={ep[ratingField(currentUser)] || 0}
                            onChange={(v) => onSetEpisodeRating(item, ep, v)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {!isMovie(item) && item.tmdbId && (
        <Section title="Episodes">
          <EpisodeBrowser
            item={item}
            loggedEpisodes={episodes || []}
            myRatingField={ratingField(currentUser)}
            partnerRatingField={ratingField(partner)}
            partnerName={userName(settings, partner)}
            onRateEpisode={mode === 'watched' && !isDNF ? (ep, v) => onSetEpisodeRating(item, ep, v) : undefined}
          />
        </Section>
      )}

      {item.tmdbId && (
        <Section title="More like this">
          <MoreLikeThis item={item} isListed={isListed} onPreview={onPreview} />
        </Section>
      )}

      <button
        type="button"
        onClick={() => onDelete(item)}
        className="w-full mt-5 min-h-11 rounded-lg border border-red-700 text-red-200 hover:bg-red-900/40 font-semibold flex items-center justify-center gap-2"
      >
        <Trash2 size={18} aria-hidden="true" /> Delete from {mode === 'toWatch' ? 'To Watch' : 'Watched'}
      </button>
    </Modal>
  );
};

export default TitleSheet;
