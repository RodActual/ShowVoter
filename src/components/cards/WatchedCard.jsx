import React, { useState } from 'react';
import { Trash2, ChevronUp, ChevronDown, Ban } from 'lucide-react';
import RatingPicker, { RatingSelect } from '../common/RatingPicker';
import { averageRating, ratingField, userColor, userName } from '../../users';

const otherUser = (key) => (key === 'user1' ? 'user2' : 'user1');

const RatingRow = ({ settings, userKey, value, children }) => (
  <div className="flex items-center justify-between gap-3 min-h-11">
    <div className="flex items-center gap-2 min-w-0">
      <span aria-hidden="true" className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: userColor(settings, userKey) }} />
      <span className="text-sm font-semibold text-gray-100 truncate">{userName(settings, userKey)}</span>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-200 tabular-nums">{value ? `${value}/10` : 'Not rated'}</span>
      {children}
    </div>
  </div>
);

const WatchedCard = ({
  item,
  currentUser, // 'user1' | 'user2'
  settings,
  isExpanded,
  onToggleExpanded,
  onDelete,
  onSetRating,
  onSetEpisodeRating
}) => {
  const [isRating, setIsRating] = useState(false);
  const isDNF = item.status === 'DNF';
  const partner = otherUser(currentUser);
  const myField = ratingField(currentUser);
  const partnerField = ratingField(partner);
  const myRating = item[myField] || 0;
  const avg = averageRating(item.anthonyRating, item.pamRating);
  const episodes = item.episodes || [];

  const episodesBySeason = episodes.reduce((acc, ep) => {
    const s = ep.season || 1;
    (acc[s] ||= []).push(ep);
    return acc;
  }, {});

  return (
    <article className={`rounded-lg shadow-lg p-4 mb-3 border bg-gray-800 ${isDNF ? 'border-red-900' : 'border-gray-700'}`}>
      <div className="flex gap-3">
        {item.posterPath && (
          <img src={item.posterPath} alt="" className={`w-16 h-24 object-cover rounded shrink-0 ${isDNF ? 'grayscale' : ''}`} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h2 className="font-semibold text-lg text-white leading-tight">{item.title}</h2>
            {!isDNF && avg > 0 && (
              <span className="text-lg font-bold text-green-400 tabular-nums shrink-0">
                {avg.toFixed(1)}<span className="text-sm text-gray-300">/10</span>
                <span className="sr-only"> average</span>
              </span>
            )}
          </div>
          {isDNF ? (
            <span className="inline-flex items-center gap-1 text-red-200 text-xs font-bold border border-red-800 px-2 py-0.5 rounded bg-red-900/40 mt-1">
              <Ban size={12} aria-hidden="true" /> Abandoned
            </span>
          ) : (
            item.watchedDate && <p className="text-gray-300 text-sm mt-1">Watched {item.watchedDate}</p>
          )}
          <div className="flex gap-2 text-sm mt-2 flex-wrap">
            <span className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded">{item.type}</span>
            {item.service && <span className="bg-purple-900 text-purple-200 px-2 py-0.5 rounded">{item.service}</span>}
          </div>
        </div>
      </div>

      {!isDNF && (
        <div className="mt-3 pt-2 border-t border-gray-700">
          <RatingRow settings={settings} userKey={currentUser} value={myRating}>
            <button
              type="button"
              aria-expanded={isRating}
              onClick={() => setIsRating((v) => !v)}
              className="min-h-11 px-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-semibold text-white"
            >
              {isRating ? 'Cancel' : myRating ? 'Change' : 'Rate'}
            </button>
          </RatingRow>
          {isRating && (
            <div className="py-2">
              <RatingPicker
                label={`Your rating for ${item.title}`}
                value={myRating}
                onChange={(value) => { onSetRating(item, value); setIsRating(false); }}
              />
            </div>
          )}
          <RatingRow settings={settings} userKey={partner} value={item[partnerField] || 0} />
        </div>
      )}

      {!isDNF && episodes.length > 0 && (
        <div className="mt-2 border-t border-gray-700 pt-1">
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={onToggleExpanded}
            className="flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200 w-full justify-center min-h-11"
          >
            {isExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
            {isExpanded ? 'Hide' : 'Show'} episodes ({episodes.length})
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-4">
              {Object.keys(episodesBySeason).map((seasonNum) => (
                <section key={seasonNum} aria-label={`Season ${seasonNum}`}>
                  <h3 className="text-xs uppercase font-bold text-gray-300 mb-2 border-b border-gray-700 pb-1">Season {seasonNum}</h3>
                  <ul className="space-y-2">
                    {episodesBySeason[seasonNum].map((ep) => (
                      <li key={`${ep.season}-${ep.num}`} className="bg-gray-700 p-3 rounded flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">E{ep.num}: {ep.title}</p>
                          <p className="text-xs text-gray-200">
                            {userName(settings, partner)}: {ep[partnerField] ? `${ep[partnerField]}/10` : 'not rated'}
                          </p>
                        </div>
                        <RatingSelect
                          label={`Your rating for season ${ep.season || 1} episode ${ep.num}`}
                          value={ep[myField] || 0}
                          onChange={(value) => onSetEpisodeRating(item, ep, value)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end mt-2">
        <button
          type="button"
          onClick={() => onDelete(item)}
          aria-label={`Delete ${item.title}`}
          className="min-w-11 min-h-11 flex items-center justify-center text-red-300 hover:text-red-200 rounded-lg"
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
};

export default WatchedCard;
